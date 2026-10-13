# PayGate Platform — Production Readiness & Architecture Overhaul

Overhauls the PayGate Bangladeshi MFS payment platform into a production-grade gateway: connecting the live Node/Express backend to PostgreSQL with atomic claim/ingest procedures, enforcing mandatory cryptographic HMAC device signing and merchant API key authentication, implementing strict domain state machine transitions, hardening the Android forwarder with Room offline queuing, and migrating the UI to real API client integration.

### User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed Architectural Directives (Phase 1 Alignment)**:
> - **PostgreSQL Database & Stored Procedures**: Full migration to PostgreSQL schema with atomic stored procedures (`fn_claim_payment_v4` and counterpart `fn_ingest_and_claim_v4`) ensuring ledger immutability and no stranded `confirming` states.
> - **Strict Authentication Enforcement**: Mandatory HMAC SHA-256 cryptographic device signatures with monotonic sequence numbers on `/v1/sms/webhook`, Bearer API key validation on merchant endpoints, and MFA-guarded admin routes with no secret leakage.
> - **Enterprise Android Forwarder**: Persistent Room SQLite database queue paired with Android WorkManager for exponential backoff retries, dynamic device enrollment, and active foreground service capabilities.

---

### 1. Overview & Core Concept

- **What It Does**: PayGate is a sovereign Bangladeshi payment gateway SaaS for bKash, Nagad, Rocket, Upay, and Cellfin. It automates MFS payment matching via dedicated SIM forwarder handsets, validates cryptographic SMS ingest, executes double-entry ledger bookkeeping, handles automated BEFTN settlement batching, and provides merchant developer toolkits and admin operations consoles.
- **Target Audience / Persona**:
  - *Bangladeshi Merchants & SaaS Operators*: Requiring direct MFS payment acceptance without high aggregator fees or delayed settlement.
  - *Operations Admins & Verifiers*: Super admins overseeing the physical SIM forwarder device fleet, monitoring wallet balances, and auditing double-entry ledgers.
  - *End Customers*: Paying via bKash, Nagad, Rocket, Upay, or Cellfin with instant reference and TrxID confirmation.
- **Key Value**: Closes the gap between modular domain logic and running services by providing atomic PostgreSQL concurrency, non-repudiable device signing, verified state machine transitions, and resilient offline forwarder queuing.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Merchant Payment Minting & Checkout**:
   - Merchant calls `POST /v1/payments` with `Authorization: Bearer <live_api_key>` and `idempotency-key`.
   - Backend validates the merchant, verifies active KYB status, fetches active pricing plan in paisa, and calculates platform fee and net payout.
   - Customer opens hosted pay page (`/pay/:id`), selects MFS provider, views assigned wallet number and 6-character normalized reference, and initiates mobile transfer.
2. **Dual-Path Atomic Matching (Option A Verifier Model)**:
   - *Customer Claims First*: Customer enters TrxID; backend calls `fn_claim_payment_v4`. If SMS has not arrived yet, status cleanly transitions to `confirming` without open connection locks.
   - *SMS Arrives First / Later*: Android forwarder cryptographically signs SMS and POSTs to `/v1/sms/webhook`. Backend executes `fn_ingest_and_claim_v4`, instantly resolving matching `confirming` payments into `paid`, writing double-entry ledger credits, and queuing signed webhooks.
3. **Admin Fleet Operations & MFA Audit Console**:
   - Admin logs in with verified session and 6-digit TOTP MFA token.
   - Fleet dashboard displays real-time battery, carrier signal, latency, and heartbeat status (secrets and sensitive hardware IDs are securely masked).
   - Review queue surfaces anomalies (underpaid, overpaid, wrong wallet, late after expiry) with single-click manual resolution or dispute rejection.

#### Visual Identity & Theme
- **Aesthetic Direction**: High-density fintech operational workspace engineered with Gate UI principles, avoiding decorative clutter and focusing on typographic clarity.
- **Color Palette & Theme Tokens**:
  - `Surface & Background`: Warm parchment stone `--bg: #FAFAF9`, pure white `--surface: #FFFFFF`, and subtle border `--border: #E7E7E3` (Dark mode: Obsidian `--bg: #0B0B0E`, Slate `--surface: #141418`).
  - `MFS Brand Accents`: bKash Crimson (`#E2136E`), Nagad Orange (`#F6921E`), Rocket Purple (`#8C3494`), Upay Tangerine (`#FF5B00`), Cellfin Emerald (`#008A44`).
  - `Status Semantics`: Success Emerald (`#12B76A`), Warning Amber (`#F79009`), Danger Coral (`#F04438`), Gate Indigo (`#5B5BF0`).
- **Typography & Hierarchy**:
  - Display & Headings: `Inter` (500/600/700) with compact tracking.
  - Telemetry & Financials: Strict monospace `JetBrains Mono` with `font-variant-numeric: tabular-nums` for currency values in paisa, TrxIDs, and references.
  - Bengali Typography: `Noto Sans Bengali` with +10% line-height adjustments for glyph legibility in customer checkout instructions.
- **Anti-Slop Discipline**:
  - No static pill capsules around metadata; metadata rendered as quiet text with typographic separators (`·`).
  - Interactive filter bars rendered as clean segmented button controls.
  - Empty states include contextual SVG guidance and primary call-to-actions.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Relational PostgreSQL Engine with Dual-Direction Atomic Claim Procedures**:
  - *Chosen Approach*: Deploy PostgreSQL with two primary stored procedures: `fn_claim_payment_v4` (customer claim) and `fn_ingest_and_claim_v4` (SMS arrival).
  - *Why*: Solves the critical bug where late-arriving SMS messages left payments stranded in `confirming`. Concurrency locks (`FOR UPDATE`) prevent double-claim race conditions and replay attacks.
  - *Alternatives Considered*: In-memory cache or Redis locks; rejected because payment gateways require transactional double-entry ledger guarantees and ACID durability.

- **Decision 2: Strict Mandatory Cryptographic Device Signature & Secret Hashing**:
  - *Chosen Approach*: Every forwarder payload requires `x-device-id`, `x-device-seq`, `x-device-timestamp`, and `x-device-signature` (HMAC SHA-256 over monotonic sequence + timestamp + payload). Device secrets are stored hashed in the database; `GET /v1/devices/status` sanitizes all sensitive material.
  - *Why*: Eliminates unauthenticated SMS forgery, prevents replay attacks via monotonic sequence validation, and guarantees audit trail integrity.

- **Decision 3: Connecting Domain Machine & Ledger to Running Server**:
  - *Chosen Approach*: Connect `server.ts` to `evaluateDomainMatch`, `applyTransition`, and double-entry ledger balance updates. Terminal payment states (`paid`, `expired`, `cancelled`) are immutable; invalid state transitions are rejected with 409 Conflict.
  - *Why*: Ensures server behavior directly matches domain rules and tests, preventing status regression.

- **Decision 4: Android Forwarder Room DB & WorkManager Resilience**:
  - *Chosen Approach*: Package `android/forwarder` with an encrypted local Room SQLite database acting as a durable queue, coupled with Android WorkManager for exponential backoff retries, dynamic device enrollment preferences, and periodic heartbeats.
  - *Why*: Protects against cellular network dropouts in field deployments, ensuring zero lost payment evidence.

---

### 4. Technical Architecture & Data Strategy

#### System Architecture & Request Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CLIENT LAYER                                    │
│  ┌───────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐  │
│  │ Merchant SaaS Portal  │  │ Hosted Checkout Page │  │ Ops Admin Console│  │
│  │ (Auth: API Key/Cookie)│  │ (Auth: Payment Token)│  │ (Auth: MFA/SSO)  │  │
│  └───────────┬───────────┘  └──────────┬───────────┘  └─────────┬────────┘  │
└──────────────┼─────────────────────────┼────────────────────────┼───────────┘
               │                         │                        │
               ▼                         ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SERVER.TS GATEWAY API                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Middlewares: Auth Validator · Rate Limiter · Idempotency Store        │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      ▼                                      │
│  ┌────────────────────┐   ┌─────────────────────┐   ┌────────────────────┐  │
│  │ Payments Router    │   │ SMS Ingest Router   │   │ Outbox Worker      │  │
│  │ - POST /v1/payments│   │ - Mandatory HMAC Sig│   │ - Webhook Dispatch │  │
│  │ - POST /claim      │   │ - Monotonic Replay  │   │ - Exponential Retry│  │
│  └─────────┬──────────┘   └──────────┬──────────┘   └──────────┬─────────┘  │
└────────────┼─────────────────────────┼─────────────────────────┼────────────┘
             │                         │                         │
             ▼                         ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CORE DOMAIN PACKAGE ENGINE                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ State Machine (transitions.ts) · Domain Matcher (evaluateDomainMatch) │  │
│  │ Multi-Provider Parsers (bKash/Nagad/Rocket/Upay/Cellfin)              │  │
│  │ Hash-Chained Audit Engine · Webhook Signer (HMAC SHA-256)             │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         POSTGRESQL RELATIONAL STORE                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Tables: merchants · pricing_plans · payments · incoming_txns          │  │
│  │         wallets · devices · ledger_entries · outbox · audit_logs      │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │ Stored Procedures:                                                    │  │
│  │ - fn_claim_payment_v4(payment_id, trx_id)                             │  │
│  │ - fn_ingest_and_claim_v4(provider, trx_id, amount, ref, sim, device)  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────▲──────────────────────────────────────┘
                                       │ Real SMS Delivery
                                       │
┌──────────────────────────────────────┴──────────────────────────────────────┐
│                    ANDROID FORWARDER HANDSET (FIELD FLEET)                  │
│  ┌─────────────────┐   ┌─────────────────────┐   ┌───────────────────────┐  │
│  │ SmsReceiver     ├──►│ Room DB Queue Store ├──►│ WorkManager Dispatcher│  │
│  │ (SIM1 / SIM2)   │   │ (Encrypted SQLite)  │   │ (HMAC Signing + Retry)│  │
│  └─────────────────┘   └─────────────────────┘   └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Core Database Schema Repairs & Enhancements
1. **Valid UUIDs & Schema Constraints**:
   - Fix seed merchant ID from `018a9x20-...` to standard RFC4122 v4 UUID `018a9020-0000-0000-0000-000000000001`.
   - Add missing `client_msg_id VARCHAR(64)` column to `incoming_txns` table to satisfy `UNIQUE (device_id, client_msg_id)`.
   - Add Upay and Cellfin wallet seed records to satisfy foreign key constraints.
2. **Double-Entry Ledger Alignment**:
   - Fix ledger schema and test fixtures to ensure `debit_paisa` and `credit_paisa` columns match standard banking double-entry constraints.
   - Enforce invariant: `sum(credit_paisa) = sum(debit_paisa)` across all balanced entries.
3. **Counterpart Procedure `fn_ingest_and_claim_v4`**:
   - When an SMS is ingested, if a matching payment in `confirming` exists with the exact provider, amount, and reference/TrxID:
     - Locks payment row `FOR UPDATE`.
     - Advances status to `paid` using the domain state machine rules.
     - Creates balanced ledger entry (credit merchant balance, debit platform fee).
     - Queues signed webhook in outbox.
4. **Row-Level Security (RLS) Hardening**:
   - Restrict merchant table updates so merchants cannot modify their own `fee_rate_bps`, `kyb_status`, or risk tier.
   - Enable RLS and define strict role policies across `incoming_txns`, `devices`, `wallets`, `outbox`, and `audit_logs`.

#### Android Forwarder Package Hardening
1. **Room Database Queue**:
   - Entities: `PendingSmsEntity(id, deviceId, seqNo, timestamp, sender, rawSms, simSlot, status, attempts)`.
   - Thread-safe FIFO dispatch worker using Android `WorkManager` with `BackoffPolicy.EXPONENTIAL`.
2. **Dynamic Enrollment & Storage**:
   - SharedPreferences-backed enrollment (Device ID, hashed shared secret, server endpoint).
   - Periodic heartbeat worker reporting battery level, charging state, SIM signal strengths, and latency.
3. **Android 14+ Compliance**:
   - Declare foreground service types (`dataSync`) and runtime `RECEIVE_SMS` / `READ_PHONE_STATE` permissions.

#### Frontend & Client Migration
1. **Live API Integration**:
   - Replace disconnected `localStorage` mock stores in `OverviewTab.tsx`, `PaymentsTab.tsx`, `SettlementsTab.tsx`, and `ReviewQueueTab.tsx` with hooks backed by `src/api/client.ts`.
   - Maintain seamless offline read cache via service worker while performing all mutations against the backend.
2. **Security & Sandbox Isolation**:
   - Add origin validation (`event.origin === window.location.origin`) in `paygate.js` to protect merchant checkouts from cross-window messaging spoofing.
   - Gate Admin dashboard behind session verification and 2FA challenge.

---

### Implementation Phases & Verification Checklist

- [ ] **Phase 1: Database Schema & Migration Fixes**:
  - Correct UUID format in seeds and migration scripts.
  - Add missing `client_msg_id` to `incoming_txns`.
  - Add Upay and Cellfin wallet seed data.
  - Implement and test `fn_ingest_and_claim_v4` stored procedure alongside `fn_claim_payment_v4`.
  - Write verified pgTAP behavioral tests for atomic claim and ledger entries.
- [ ] **Phase 2: Gateway Server (`server.ts`) Overhaul**:
  - Connect server routes to PostgreSQL pool and stored procedures.
  - Enforce `Authorization: Bearer <api_key>` on merchant endpoints.
  - Enforce mandatory HMAC device signing and sequence numbers on `/v1/sms/webhook`.
  - Wire domain `evaluateDomainMatch` and `applyTransition` to prevent invalid status regressions.
  - Implement outbox processor with automatic backoff worker and payment expiry sweeper.
  - Hide secrets in `GET /v1/devices/status` and guard admin endpoints with MFA checks.
- [ ] **Phase 3: Android Forwarder Production Suite**:
  - Implement Room DB queue and WorkManager dispatcher in `android/forwarder`.
  - Add heartbeat service, dynamic enrollment configuration, and Android 14 foreground permissions.
- [ ] **Phase 4: Frontend API Binding & Security**:
  - Switch UI components from localStorage to `src/api/client.ts` endpoints.
  - Add strict origin checks in `public/paygate.js`.
  - Fix npm package peer dependencies and lockfile consistency for clean CI builds.
- [ ] **Phase 5: End-to-End Verification**:
  - Run full test suite, pgTAP claim tests, and verify lint and build compilation.
