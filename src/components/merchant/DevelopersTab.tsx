import React, { useState } from 'react';
import {
  Key,
  Copy,
  Check,
  RefreshCw,
  Code2,
  Send,
  ShieldCheck,
  Terminal,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { usePayGate } from '../../context/PayGateContext';
import { GateButton } from '../gate-ui/GateButton';
import { GateInput } from '../gate-ui/GateInput';
import { EmptyState } from '../gate-ui/EmptyState';
import { signWebhookPayload, verifyWebhookSignature } from '../../utils/webhook';

export const DevelopersTab: React.FC = () => {
  const {
    merchant,
    webhookDeliveries,
    resendWebhook,
    updateMerchantSettings,
    addToast,
  } = usePayGate();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [webhookUrlInput, setWebhookUrlInput] = useState(merchant.webhookUrl);
  const [isRotatingSecret, setIsRotatingSecret] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'curl' | 'node' | 'python' | 'js'>('curl');

  // Interactive Webhook Tester state
  const [testPayload, setTestPayload] = useState(
    JSON.stringify(
      {
        event_id: 'evt_test_94821',
        event: 'payment.paid',
        payment_id: 'pay_01ha9x201',
        order_id: 'ORD-94812',
        reference: 'K7M4X2QH',
        amount_paisa: 120000,
        fee_paisa: 6000,
        net_paisa: 114000,
        matched_by: 'trxid+reference',
        trx_id: 'DJC9SZQV0J',
      },
      null,
      2
    )
  );
  const [testSignatureHeader, setTestSignatureHeader] = useState('');
  const [testVerificationResult, setTestVerificationResult] = useState<{
    tested: boolean;
    valid?: boolean;
    reason?: string;
  }>({ tested: false });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
    addToast('Copied to Clipboard', label, 'info');
  };

  const handleSaveWebhookUrl = (e: React.FormEvent) => {
    e.preventDefault();
    updateMerchantSettings({ webhookUrl: webhookUrlInput });
  };

  const handleRotateWebhookSecret = () => {
    const newSecret = `whsec_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    setIsRotatingSecret(true);
    setTimeout(() => {
      updateMerchantSettings({ webhookSecret: newSecret });
      setIsRotatingSecret(false);
      addToast('Webhook Secret Rotated', '24-hour overlap grace period active for old secret', 'warning');
    }, 400);
  };

  const handleTestSign = async () => {
    const { signatureHeader } = await signWebhookPayload(merchant.webhookSecret, testPayload);
    setTestSignatureHeader(signatureHeader);
    const verification = await verifyWebhookSignature(signatureHeader, testPayload, merchant.webhookSecret);
    setTestVerificationResult({
      tested: true,
      valid: verification.isValid,
      reason: verification.reason,
    });
  };

  const codeSnippets = {
    curl: `curl -X POST https://api.paygate.com/v1/payments \\
  -H "Authorization: Bearer ${merchant.liveApiKey}" \\
  -H "Idempotency-Key: ${Date.now()}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "plan_id": "plan_pro_monthly",
    "order_id": "ORD-10928",
    "provider": "bkash",
    "callback_url": "${merchant.webhookUrl}",
    "success_url": "https://yoursite.com/checkout/success"
  }'`,
    node: `// Node.js (Express / Next.js) Webhook Verification
import crypto from 'crypto';

app.post('/webhooks/paygate', express.raw({ type: 'application/json' }), (req, res) => {
  const signatureHeader = req.headers['paygate-signature']; // t=17918...,v1=hex...
  const [tPart, v1Part] = signatureHeader.split(',');
  const timestamp = tPart.split('=')[1];
  const signature = v1Part.split('=')[1];

  const payload = timestamp + '.' + req.body.toString();
  const hmac = crypto.createHmac('sha256', '${merchant.webhookSecret}')
                     .update(payload)
                     .digest('hex');

  if (hmac !== signature) {
    return res.status(401).send('Signature mismatch');
  }

  const event = JSON.parse(req.body.toString());
  if (event.event === 'payment.paid') {
    // Fulfill order: event.order_id, event.net_paisa
    console.log('Payment verified:', event.payment_id);
  }
  res.json({ received: true });
});`,
    python: `# Python (FastAPI / Flask) Verification
import hmac, hashlib

def verify_paygate_webhook(raw_body_bytes, signature_header, secret):
    parts = dict(p.split('=') for p in signature_header.split(','))
    timestamp = parts.get('t')
    expected_v1 = parts.get('v1')
    
    signed_payload = f"{timestamp}.{raw_body_bytes.decode('utf-8')}".encode('utf-8')
    computed = hmac.new(secret.encode('utf-8'), signed_payload, hashlib.sha256).hexdigest()
    
    return hmac.compare_digest(computed, expected_v1)`,
    js: `<!-- Embed PayGate Popup Modal SDK on your customer checkout page -->
<script src="https://pay.example.com/paygate.js"></script>

<button id="pay-btn">Pay with MFS (bKash / Nagad / Rocket)</button>

<script>
  document.getElementById('pay-btn').addEventListener('click', async () => {
    // 1. Call your backend server to create payment session via POST /v1/payments
    const res = await fetch('/api/create-payment-order', { method: 'POST' });
    const { id } = await res.json(); // e.g. "pay_01ha9x201"

    // 2. Open PayGate interactive popup modal overlay
    PayGate.open({
      paymentId: id,
      onSuccess: function(data) {
        console.log('Payment verified and paid atomically!', data);
        window.location.href = '/order/confirmed';
      },
      onClose: function() {
        console.log('Customer dismissed checkout modal');
      }
    });
  });
</script>`,
  };

  return (
    <div className="space-y-6">
      {/* API Keys Panel */}
      <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--ink)]">API Authentication Keys</h3>
          <p className="text-xs text-[var(--ink-2)] mt-0.5">
            Use these keys to authenticate requests from your backend server. Never expose live keys in client-side code.
          </p>
        </div>

        <div className="space-y-3">
          {/* Live Secret Key */}
          <div className="p-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-[var(--ink-3)] block">Live Secret Key (Production)</span>
              <span className="font-mono text-xs font-semibold text-[var(--ink)] truncate block">
                {merchant.liveApiKey}
              </span>
            </div>
            <GateButton
              variant="secondary"
              size="sm"
              onClick={() => copyToClipboard(merchant.liveApiKey, 'Live Secret Key')}
              icon={copiedKey === 'Live Secret Key' ? <Check className="w-3.5 h-3.5 text-[var(--success)]" /> : <Copy className="w-3.5 h-3.5" />}
            >
              Copy
            </GateButton>
          </div>

          {/* Test Secret Key */}
          <div className="p-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-[var(--ink-3)] block">Test Secret Key (Sandbox)</span>
              <span className="font-mono text-xs font-semibold text-[var(--ink)] truncate block">
                {merchant.testApiKey}
              </span>
            </div>
            <GateButton
              variant="secondary"
              size="sm"
              onClick={() => copyToClipboard(merchant.testApiKey, 'Test Secret Key')}
              icon={copiedKey === 'Test Secret Key' ? <Check className="w-3.5 h-3.5 text-[var(--success)]" /> : <Copy className="w-3.5 h-3.5" />}
            >
              Copy
            </GateButton>
          </div>
        </div>
      </div>

      {/* Webhook Configuration & Secret */}
      <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-[var(--ink)]">Signed Webhooks (HMAC-SHA256)</h3>
          <p className="text-xs text-[var(--ink-2)] mt-0.5">
            PayGate notifies your endpoint when payments are paid, expired, or flagged. All webhooks include a{' '}
            <code className="font-mono text-[var(--accent)] font-semibold">PayGate-Signature: t=&lt;unix&gt;,v1=&lt;hex&gt;</code> header.
          </p>
        </div>

        <form onSubmit={handleSaveWebhookUrl} className="flex gap-2">
          <div className="flex-1">
            <GateInput
              label="Merchant Webhook Endpoint URL"
              value={webhookUrlInput}
              onChange={(e) => setWebhookUrlInput(e.target.value)}
              placeholder="https://api.yourdomain.com/webhooks/paygate"
              isMono
              required
            />
          </div>
          <div className="pt-6">
            <GateButton type="submit" variant="primary" size="md">
              Save URL
            </GateButton>
          </div>
        </form>

        {/* Webhook Secret */}
        <div className="p-3.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-[var(--ink-3)] block">Webhook Signing Secret</span>
            <span className="font-mono text-xs font-bold text-[var(--ink)] select-all truncate block">
              {merchant.webhookSecret}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <GateButton
              variant="secondary"
              size="sm"
              onClick={() => copyToClipboard(merchant.webhookSecret, 'Webhook Secret')}
              icon={copiedKey === 'Webhook Secret' ? <Check className="w-3.5 h-3.5 text-[var(--success)]" /> : <Copy className="w-3.5 h-3.5" />}
            >
              Copy
            </GateButton>
            <GateButton
              variant="secondary"
              size="sm"
              isLoading={isRotatingSecret}
              onClick={handleRotateWebhookSecret}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Rotate Secret
            </GateButton>
          </div>
        </div>
      </div>

      {/* Interactive Webhook Signature Verifier & Delivery Inspector */}
      <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--ink)]">Interactive Webhook Signature Tester</h3>
            <p className="text-xs text-[var(--ink-2)]">Test HMAC-SHA256 signature computation and payload validation</p>
          </div>
          <GateButton
            variant="primary"
            size="sm"
            onClick={handleTestSign}
            icon={<ShieldCheck className="w-3.5 h-3.5" />}
          >
            Compute & Verify Signature
          </GateButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-[var(--ink-3)] block mb-1">Sample Event Payload (JSON)</label>
            <textarea
              rows={8}
              value={testPayload}
              onChange={(e) => setTestPayload(e.target.value)}
              className="w-full p-3 font-mono text-xs bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-[var(--ink-3)] block mb-1">Generated Header</label>
              <div className="p-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl font-mono text-xs text-[var(--ink-2)] break-all min-h-[50px]">
                {testSignatureHeader || 'Click "Compute & Verify Signature" above to generate PayGate-Signature'}
              </div>
            </div>

            {testVerificationResult.tested && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  testVerificationResult.valid
                    ? 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30'
                    : 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/30'
                }`}
              >
                {testVerificationResult.valid ? (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Signature verified successfully! Timestamp valid and HMAC-SHA256 hash matches payload.</span>
                  </>
                ) : (
                  <span>Verification Failed: {testVerificationResult.reason}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Code Integration Guide */}
      <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--ink)]">Integration Code Samples</h3>
            <p className="text-xs text-[var(--ink-2)]">Drop-in examples for creating payments and handling webhooks</p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-[var(--surface-2)] rounded-lg">
            {(['curl', 'node', 'python', 'js'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLanguage(lang)}
                className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer transition-colors ${
                  selectedLanguage === lang
                    ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                    : 'text-[var(--ink-2)] hover:text-[var(--ink)]'
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <pre className="p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl font-mono text-xs text-[var(--ink)] overflow-x-auto select-all leading-relaxed">
          {codeSnippets[selectedLanguage]}
        </pre>
      </div>

      {/* Webhook Delivery Log Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h3 className="text-sm font-semibold text-[var(--ink)]">Recent Webhook Deliveries</h3>
          <p className="text-xs text-[var(--ink-3)]">
            Retries scheduled at 10s, 1m, 5m, 30m, 2h, 6h, 24h upon endpoint failure.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-2)]/60 text-[var(--ink-3)] font-medium border-b border-[var(--border)]">
              <tr>
                <th className="py-3 px-4">Event ID</th>
                <th className="py-3 px-4">Event</th>
                <th className="py-3 px-4">Endpoint</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Attempt</th>
                <th className="py-3 px-4 text-right">Last Dispatched</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--ink)] font-mono">
              {webhookDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 font-sans">
                    <EmptyState
                      title="No Webhook Events Dispatched Yet"
                      description="Webhook deliveries will appear here automatically when payments are marked paid, expired, or flagged for review."
                    />
                  </td>
                </tr>
              ) : (
                webhookDeliveries.map((w) => (
                  <tr key={w.id} className="hover:bg-[var(--surface-2)]/40 transition-colors">
                    <td className="py-3 px-4 font-semibold">{w.id}</td>
                    <td className="py-3 px-4 font-sans font-medium text-[var(--accent)]">{w.event}</td>
                    <td className="py-3 px-4 text-[var(--ink-2)] truncate max-w-[200px]">{w.url}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--success)]/10 text-[var(--success)]">
                        {w.statusCode} OK
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-sans text-xs">
                      {w.attempt} / {w.maxAttempts}
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--ink-3)]">
                      {new Date(w.lastAttemptAt).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <GateButton
                        variant="ghost"
                        size="sm"
                        onClick={() => resendWebhook(w.id)}
                        icon={<RefreshCw className="w-3 h-3" />}
                      >
                        Resend
                      </GateButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
