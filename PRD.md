# PayGate Platform — Product Requirements Document (PRD v4.0)

**Document Title**: PayGate Platform — Product Requirements Document v4.0 (Monorepo Architecture & 5-Provider MFS Gateway)  
**System Architecture**: Vite 8 + React 19 Monorepo · Supabase / PostgreSQL 15+ · Option A Verifier Custody · Progressive Web App (PWA)  
**Framework Decision**: Vite SPA was selected over Next.js to enforce strict subdomain build isolation (admin code cannot leak to merchant or checkout bundles), eliminate SSR server bloat at the edge for static checkout shells, and cleanly separate client UI from backend API services touching money.  
**Design System**: Gate UI Design System  
**Companion Documents**: PayGate SMS Forwarder PRD v4.0 · Gate UI Tokens & Design Specification · Architecture Decision Records (ADRs)  
**Date**: 13 October 2026  
**Status**: Production Architecture & Monorepo Implementation  

---

## 1. Product at a Glance

PayGate enables Bangladeshi online merchants to accept **bKash**, **Nagad**, **Rocket**, **Upay**, and **Cellfin** (IBBL) mobile financial and digital banking payments with **zero provider direct API integration**, no personal merchant numbers, and no merchant-side phone infrastructure.

Customers transfer funds to a PayGate-managed wallet pool quoting an 8-character, polynomial typo-checked reference. A dedicated Super Admin Android Forwarder handset running the PayGate Forwarder app pushes confirmation SMS messages to the server over an IP-whitelisted, cryptographically signed endpoint. The atomic matching engine verifies the transaction, fires HMAC-SHA256 signed webhooks to the merchant, and records double-entry ledger entries for automated BEFTN bank or MFS payout batching.

**The Core Invariant**: Pure rules (money arithmetic, references, SMS parsers, state machines, matching rules) are shared, tested code, and the only components that touch money are the server-authoritative API and PostgreSQL database.

---

## 2. Monorepo Architecture & Isolation Boundary

The PayGate codebase is structured as a decoupled monorepo to guarantee that sensitive administrative and operational logic never reaches a merchant or customer browser bundle:

```
paygate/
├── apps/
│   ├── checkout/                 # pay.* hosted checkout page and paygate.js popup
│   ├── merchant/                 # merchant.* merchant SaaS portal (no admin code bundled)
│   ├── admin/                    # admin.* operations console (SSO & MFA only)
│   └── api/                      # Fastify / Express service (/v1 REST, SMS ingest, outbox worker)
├── packages/
│   ├── domain/                   # Pure TypeScript: branded paisa, transitions, reference checksums, SMS adapters
│   ├── contracts/                # Zod schemas & generated OpenAPI 3.1 specifications
│   ├── ui/                       # Gate UI design tokens & shared components
│   ├── i18n/                     # English & Bengali localized message catalogs
│   └── config/                   # Shared tsconfig, ESLint, and vitest presets
├── android/forwarder/            # Kotlin background SMS receiver & cryptographic signer
├── supabase/
│   ├── migrations/               # PostgreSQL schema, quarantine table, & atomic claim function
│   └── tests/                    # pgTAP ledger invariants & claim test suite
├── infra/                        # Deployment workflows & Grafana dashboards
└── docs/                         # PRD, DESIGN, ADRs, incident runbooks
```

### 2.1 Subdomain Routing & Isolation Matrix

| Subdomain | App Package | Target Users | Key Routes & Boundaries |
| :--- | :--- | :--- | :--- |
| **`pay.example.com`** | `apps/checkout` | End-User Buyers | Hosted checkout `/pay/:id` and popup overlay (`paygate.js`). Renders provider instructions, one-tap copy, TrxID submission, and 6 Gate UI states. |
| **`merchant.example.com`** | `apps/merchant` | Online Merchants, Store Owners, Finance Teams | `/overview`, `/payments`, `/plans`, `/settlements`, `/developers`, `/settings`. Self-service payment monitoring, pricing plans in integer paisa, double-entry statement auditing, and payout initiation. |
| **`admin.example.com`** | `apps/admin` | PayGate Operations, Risk Officers, Platform Engineers | `/admin` (overview), `/admin/device` (Super Admin SMS Forwarder & IP Firewall), `/admin/wallets` (pool limits & auto-drain), `/admin/review` (discrepancy resolution), `/admin/payouts` (BEFTN batching & maker-checker clearing), `/admin/audit` (immutable audit trail). |
| **`api.example.com`** | `apps/api` | Merchant Backends, Forwarder Handset Fleet | `/v1/payments`, `/v1/pay/:id/confirm`, `/v1/sms/webhook`, `/v1/devices/heartbeat`, `/v1/outbox/process`. Authoritative financial state machine, double-entry ledger, cryptographic signature verification. |

### 2.2 Framework Decision Rationale (Vite vs. Next.js)

1. **Subdomain Bundle Isolation**: With Vite, `apps/checkout`, `apps/merchant`, and `apps/admin` compile into distinct standalone bundles (`build:checkout`, `build:merchant`, `build:admin`). Operations code, device telemetry, and internal audit routines are physically excluded from merchant and customer bundles.
2. **Edge Performance & PWA**: The checkout shell is a static client-side PWA asset capable of sub-second cold starts without requiring a Node.js SSR runtime on edge proxies.
3. **Custody & Separation of Concerns**: Browser apps cannot mutate financial state directly. They submit signed intents through `@paygate/contracts` to the backend API (`server.ts`), which enforces atomic database constraints.
4. **Developer Velocity**: Instant Vite/esbuild compilation across shared TypeScript packages without complex multi-zone SSR configurations.

---

## 3. Pure Domain Rules & Financial Invariants (`@paygate/domain`)

### 3.1 Branded Integer-Paisa Type
All currency values are strictly represented in integer paisa using TypeScript nominal branding:
```ts
export type Paisa = number & { readonly __brand: unique symbol };
```
- Floating-point numbers are prohibited in currency arithmetic.
- Conversions (`toPaisa`, `bdtToPaisa`, `paisaToBdt`, `calculateFeeAndNet`) enforce integer rounding at boundary input.
- Fee calculations: `feePaisa = Math.round((gross * feeRateBps) / 10000)` where `feeRateBps = 500` (5.00%).

### 3.2 Explicit Payment Lifecycle State Machine
Payment states follow a strict non-reversible transition table:
```
created ──> awaiting_payment ──┬──> confirming ──┬──> paid (Terminal)
                               │                 ├──> needs_review ──┬──> paid (Terminal)
                               │                 │                   └──> cancelled (Terminal)
                               │                 └──> expired (Terminal)
                               └──> cancelled / expired (Terminal)
```
- Terminal states (`paid`, `expired`, `cancelled`) are immutable. Corrections must be recorded as separate ledger adjustment entries.
- The transition table is mirrored in PostgreSQL table check constraints and atomic stored procedures (`fn_claim_payment_v4`). Only the API backend may alter payment status.

### 3.3 Polynomial Typo-Checked Reference Generator
- 8-character charset excluding visual look-alikes (`0/O`, `1/I/L`): `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (31 distinct characters).
- 7 random base characters + 1 prime-weighted modulo-31 check character.
- Catches single-character transcription errors and adjacent character transpositions.

### 3.4 Provider SMS Adapters & Quarantine Pipeline
- Dedicated adapters for **bKash**, **Nagad**, **Rocket**, **Upay**, and **Cellfin**.
- Each adapter implements explicit `detect(text, sender)` and `parse(text, sender, simSlot)` routines.
- **No Default Fallback**: If an incoming SMS does not match an official provider shortcode or pattern, it is never defaulted to bKash.
- **Quarantine Pipeline**: Unparseable or rejected SMS payloads are inserted into `public.quarantined_sms` with client IP and failure reason for security review.

---

## 4. End-to-End Payment Flow & Journey Map

```
[Customer on Merchant Storefront]
        │
        │ 1. Merchant backend calls POST https://api.example.com/v1/payments
        ▼
[PayGate API Server]
        │
        │ 2. Assigns pool wallet + generates 8-char reference (e.g., K7M4X2QH)
        ▼
[Hosted Pay Page / paygate.js Popup Modal]
        │
        │ 3. Customer copies Wallet Number & Reference, completes transfer in MFS app
        │ 4. Customer submits TrxID and clicks "Confirm Payment"
        ▼
[Super Admin Forwarder Handset] ──(Tower SMS)──> [SMS Ingest: POST /v1/sms/webhook]
                                                        │
                                                        │ 4.1. Cryptographic Device Signature & Anti-Replay Check
                                                        │ 4.2. IP Whitelist Firewall Check
                                                        │
                                                        │ 5. Per-provider adapter extracts amount, TrxID, ref
                                                        ▼
                                              ┌──────────────────┐
                                              │  Matching Engine │
                                              └──────────────────┘
                                                        │
                                ┌───────────────────────┴───────────────────────┐
                                ▼                                               ▼
                     [Confirmed Match]                                 [Conflict / Discrepancy]
                                │                                               │
             ┌──────────────────┴──────────────────┐                            ▼
             ▼                                     ▼                     [Review Queue]
       Status → paid                       HMAC Webhook Fired            (underpaid, overpaid,
     (UI shows green check)             (payment.paid dispatched)        wrong_wallet, late)
             │
             ▼
       [Ledger Entries]
       - Credit Merchant Payable (Gross)
       - Debit 5% Platform Fee
       - Available Balance accumulates towards Tk 1,000 threshold
             │
             ▼
   [Automated BEFTN Batching]
   - Payout requests grouped into clearing batch (pob_...)
   - Ops Maker creates batch → Independent Checker approves with 2FA
   - Net funds cleared to merchant bank accounts
```

---

## 5. Security & Cryptographic Specifications

1. **Device Signature & Anti-Replay Defense**:
   - The Android forwarder signs payload packets: `HMAC-SHA256(deviceSecret, deviceId:seqNo:timestamp:rawSms)`.
   - Headers: `X-Device-Id`, `X-Device-Seq`, `X-Device-Timestamp`, `X-Device-Signature`.
   - Monotonic sequence counter (`seqNo > lastSeqNo`) strictly prevents replay attacks.
   - Timestamp drift tolerance is enforced at $\pm 300\text{ seconds}$.

2. **Tamper-Evident Hash-Chained Audit Log**:
   - Every compliance and security audit entry incorporates the SHA-256 hash of the preceding entry:
     `entryHash = SHA-256(previousHash : sequence : actor : action : details : createdAt)`
   - Genesis block uses 64 zeros. Any manual record alteration breaks the cryptographic verification chain.

3. **Webhook Verification (HMAC-SHA256)**:
   - Header: `PayGate-Signature: t=<unix>,v1=<hex_hmac>`.
   - Signed content: `${timestamp}.${rawJsonBody}`.
   - Constant-time comparison prevents timing side-channel attacks.

4. **Customer Anti-Brute-Force Lockout**:
   - 5 consecutive invalid TrxID submission attempts locks the checkout session for 15 minutes.

---

## 6. Embeddable Checkout SDK (`public/paygate.js`)

Merchants can embed the public popup checkout script directly:
```html
<script src="https://pay.example.com/paygate.js"></script>
<script>
  PayGate.open({
    paymentId: 'pay_01ha9x201',
    onSuccess: function(data) {
      console.log('Payment verified atomically', data);
      window.location.href = '/checkout/success';
    },
    onClose: function() {
      console.log('Customer dismissed checkout');
    }
  });
</script>
```
- Communication between parent window and checkout iframe is conducted via strongly-typed `postMessage` events (`paygate:paid`, `paygate:close`, `paygate:error`).

---

## 7. Service Worker & Caching Isolation

- **PWA Shell Caching**: Caches only static assets for the customer checkout shell (`**/*.{js,css,html,ico,png,svg,woff,woff2}`).
- **Strict Authenticated Bypass**: `navigateFallbackDenylist` and runtime caching explicitly exclude all authenticated merchant routes (`/merchant/*`, `/settings/*`, `/developers/*`), admin routes (`/admin/*`), and API routes (`/v1/*`, `/api/*`).
- Dynamic API responses are strictly enforced as `NetworkOnly` and never stored in service worker caches.

---

## 8. Automated Verification & Quality SLAs

| Metric | Target | Verification Method |
| :--- | :--- | :--- |
| **Domain Test Suite** | 45/45 Passed ($100\%$) | `npm test` (`scripts/run-tests.ts`) |
| **Static Type Safety** | 0 errors | `npm run lint` (`tsc --noEmit` with `strict: true`) |
| **Isolated Build Health** | $100\%$ clean outputs | `npm run build:checkout`, `npm run build:merchant`, `npm run build:admin` |
| **Matching Latency** | $p95 < 5\text{ seconds}$ | Time from TrxID confirmation to `paid` status when SMS exists. |
| **SMS Ingest Latency** | $p95 < 3\text{ seconds}$ | Handset SMS dispatch to database ingestion. |
| **Availability** | $99.9\%$ monthly | Uptime across API service, webhook dispatcher, and hosted checkout. |
