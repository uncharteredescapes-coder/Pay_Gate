# PayGate Platform — Bangladeshi Merchant MFS Gateway (v4.0)

PayGate enables Bangladeshi online merchants to accept **bKash**, **Nagad**, **Rocket**, **Upay**, and **Cellfin** (IBBL) payments with **zero provider direct API integration**. Customers transfer funds to a managed wallet pool quoting an 8-character polynomial typo-checked reference. A dedicated Super Admin Android handset relays confirmation SMS messages over an IP-whitelisted, cryptographically signed endpoint, the atomic matching engine verifies the transaction, the merchant receives an HMAC-SHA256 signed webhook, and net funds are recorded in a double-entry ledger for automated BEFTN bank payout batching.

Built with **React 19**, **Vite 8**, **Tailwind CSS v4**, and the **Gate UI Design System**, structured as a decoupled monorepo where pure rules are shared, tested code, and the only components touching money are the API and PostgreSQL database.

---

## 📁 Monorepo Structure

```
paygate/
├── apps/
│   ├── checkout/                 # pay.* hosted checkout page and paygate.js popup
│   ├── merchant/                 # merchant.* merchant SaaS portal (no admin code bundled)
│   ├── admin/                    # admin.* ops console (SSO & MFA only)
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

---

## 📐 Framework Decision: Vite vs. Next.js

**Vite SPA** was selected over Next.js for PayGate for four fundamental reasons:
1. **Zero Bundle Leakage**: Each application (`apps/checkout`, `apps/merchant`, `apps/admin`) is built as an independent bundle deployed to its own subdomain. This ensures admin operations and internal code can never reach a merchant's or customer's browser.
2. **Edge Performance & PWA**: The checkout hosted page and popup shell are 100% static client-cacheable PWA assets. They cold-start under 1.2s without requiring a Node.js SSR runtime on edge proxies.
3. **Strict Separation of Money Mutation**: Client applications are purely presentation layers communicating via typed `@paygate/contracts`. All money movements, ledger mutations, and database checks are authoritatively handled by the backend API and PostgreSQL.
4. **Build & Transpilation Speed**: Vite + esbuild delivers near-instant dev server startup and deterministic, reproducible builds.

---

## 🌐 Subdomain Routing & Portals

| Subdomain | App Directory | Port / Route | Description |
| :--- | :--- | :--- | :--- |
| **`pay.example.com`** | `apps/checkout` | `/pay/:id` | **Customer Checkout**: Hosted pay page and `paygate.js` popup modal. Renders 6 Gate UI states, provider selection, one-tap copy, and TrxID confirmation. |
| **`merchant.example.com`** | `apps/merchant` | `/` | **Merchant Portal**: GMV overview, real-time payments list, server-authoritative plans (in paisa), double-entry ledger, webhook logs, and KYB settings. |
| **`admin.example.com`** | `apps/admin` | `/admin` | **Operations Console**: Super Admin forwarder handset profile, IP firewall, wallet pool auto-drain, review queue, BEFTN payout batching, and tamper-evident audit log. |
| **`api.example.com`** | `apps/api` | `/v1/*` | **Backend API & Sandbox**: REST endpoints, cryptographic signature verification, SMS ingest webhook, and interactive API sandbox. |

---

## 🚀 Pure Domain Logic (`@paygate/domain`)

- **Branded Integer-Paisa Arithmetic**: Currency values use the branded type `Paisa = number & { readonly __brand: unique symbol }`. Floating-point numbers are strictly banned from money calculations.
- **Explicit Payment State Machine**: Non-reversible state transitions (`created` → `awaiting_payment` → `confirming` → `paid` | `needs_review` | `expired`). Terminal states (`paid`, `expired`, `cancelled`) are immutable.
- **Polynomial Reference Generator**: 8-character charset (`23456789ABCDEFGHJKMNPQRSTUVWXYZ`) with prime-weighted modulo-31 checksum. Excludes look-alikes (`0/O`, `1/I/L`).
- **Provider Adapters**: Explicit regex matching and parsing for **bKash**, **Nagad**, **Rocket**, **Upay**, and **Cellfin**. Unparseable messages are moved to the `quarantined_sms` table instead of being dropped.
- **Cryptographic Security**: HMAC-SHA256 device signing with monotonic sequence counter for replay defense, and SHA-256 hash-chained audit logging.

---

## 🛠️ Getting Started & CLI Scripts

### 1. Prerequisites
- **Node.js**: `v20.0.0` or higher
- **npm** or **pnpm**

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-org/paygate.git
cd paygate

# Install dependencies
npm install
```

### 3. Development Server
```bash
# Starts full-stack server (Express backend + Vite middleware on http://localhost:3000)
npm run dev
```

### 4. Running Domain Tests
```bash
# Executes 45 domain unit tests covering math, transitions, references, and golden fixtures
npm test
```

### 5. Type Checking & Code Quality
```bash
# Runs TypeScript compiler in strict mode (zero errors required)
npm run lint
```

### 6. Production Builds
```bash
# Build master bundle
npm run build

# Build individual standalone apps
npm run build:checkout   # Builds apps/checkout/dist
npm run build:merchant   # Builds apps/merchant/dist
npm run build:admin      # Builds apps/admin/dist
```

---

## 🔌 API & Integration Guide

### Creating a Payment Session
```bash
curl -X POST https://api.example.com/v1/payments \
  -H "Authorization: Bearer sk_live_8e1d2c3b4a5f607182934" \
  -H "Idempotency-Key: req_09182310" \
  -H "Content-Type: application/json" \
  -d '{
    "plan_id": "plan_pro_monthly",
    "order_id": "ORD-94812",
    "provider": "bkash",
    "callback_url": "https://api.yourdomain.com/webhooks/paygate",
    "success_url": "https://yourdomain.com/checkout/success"
  }'
```

### Embeddable Popup Checkout Modal (`paygate.js`)
```html
<!-- Include public SDK script on your checkout page -->
<script src="https://pay.example.com/paygate.js"></script>

<button id="pay-btn">Pay with MFS (bKash / Nagad / Rocket)</button>

<script>
  document.getElementById('pay-btn').addEventListener('click', async () => {
    // 1. Create payment session from your server
    const res = await fetch('/api/create-payment', { method: 'POST' });
    const { id } = await res.json();

    // 2. Open interactive popup modal overlay
    PayGate.open({
      paymentId: id,
      onSuccess: function(data) {
        console.log('Payment verified and paid atomically!', data);
        window.location.href = '/order/confirmation';
      },
      onClose: function() {
        console.log('Customer dismissed checkout modal');
      }
    });
  });
</script>
```

### Forwarder Handset Ingest with Cryptographic Signature
```bash
curl -X POST https://api.example.com/v1/sms/webhook \
  -H "X-Device-Id: dev_superadmin_01" \
  -H "X-Device-Seq: 101" \
  -H "X-Device-Timestamp: 1791892800" \
  -H "X-Device-Signature: 8f9a2b...hex_sha256" \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "bKash",
    "raw_sms": "You have received Tk 1,200.00 from 01712750278. Fee Tk 0.00. Balance Tk 14,500.00. TrxID DJC9SZQV0J and Ref K7M4X2QH at 13/10/2026 15:24.",
    "sim_slot": 1
  }'
```

### Webhook Verification (Node.js)
```javascript
import crypto from 'crypto';

app.post('/webhooks/paygate', express.raw({ type: 'application/json' }), (req, res) => {
  const signatureHeader = req.headers['paygate-signature']; // t=<unix>,v1=<hex>
  const [tPart, v1Part] = signatureHeader.split(',');
  const timestamp = tPart.split('=')[1];
  const signature = v1Part.split('=')[1];

  // Replay prevention: reject timestamps older than 5 minutes
  if (Math.abs(Math.floor(Date.now() / 1000) - parseInt(timestamp, 10)) > 300) {
    return res.status(401).send('Timestamp expired');
  }

  const payload = timestamp + '.' + req.body.toString();
  const expected = crypto.createHmac('sha256', process.env.PAYGATE_WEBHOOK_SECRET)
                         .update(payload)
                         .digest('hex');

  if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    const event = JSON.parse(req.body.toString());
    if (event.event === 'payment.paid') {
      console.log(`Payment settled for Order ${event.order_id}: Tk ${event.amount_paisa / 100}`);
    }
    return res.json({ received: true });
  }

  res.status(401).send('Signature mismatch');
});
```

---

## 🔒 Service Worker & Cache Isolation

- **PWA Scope**: Caches only static assets required to render the customer checkout shell.
- **Exclusion Rules**: Workbox `navigateFallbackDenylist` and runtime caching strictly exclude all authenticated merchant pages (`/merchant/*`, `/settings/*`, `/developers/*`), admin routes (`/admin/*`), and API routes (`/v1/*`, `/api/*`).
- **Network Enforcement**: API responses are strictly handled as `NetworkOnly` and are never written to disk or service worker cache.

---

## 📄 License & Compliance

© 2026 PayGate Technologies Bangladesh Ltd. All rights reserved.  
Complies with Bangladesh Bank National Payment Switch Guidelines and MFS Pooling Runbook v4.0.
