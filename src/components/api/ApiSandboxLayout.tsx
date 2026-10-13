import React, { useState } from 'react';
import {
  Code2,
  Terminal,
  Send,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  Server,
  Zap,
  CheckCircle2,
  AlertCircle,
  Globe,
  Radio,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { usePayGate } from '../../context/PayGateContext';
import { useRouter } from '../../router';
import { GateButton } from '../gate-ui/GateButton';

interface EndpointSpec {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  title: string;
  description: string;
  requiresIpWhitelist?: boolean;
  defaultHeaders: Record<string, string>;
  defaultBody?: string;
}

export const ApiSandboxLayout: React.FC = () => {
  const {
    merchant,
    superAdminDevice,
    payments,
    wallets,
    createPayment,
    ingestForwardedSms,
    pingSuperAdminDevice,
    verifyClientIp,
    addToast,
  } = usePayGate();
  const { navigate } = useRouter();

  const endpoints: EndpointSpec[] = [
    {
      id: 'sms-forward',
      method: 'POST',
      path: '/api/v1/sms/forward',
      title: 'Super Admin SMS Forwarder Ingest',
      description: 'Webhook endpoint invoked by the physical Android forwarder device upon receiving MFS SMS. Verified by device bearer token and IP firewall whitelisting.',
      requiresIpWhitelist: true,
      defaultHeaders: {
        'Content-Type': 'application/json',
        'X-Forwarder-Device-Token': superAdminDevice.token,
        'X-Forwarder-Client-IP': superAdminDevice.activeClientIp,
      },
      defaultBody: JSON.stringify(
        {
          rawSms: `You have received Tk 1,200.00 from 01712750278. Fee Tk 0.00. Balance Tk 14,500.00. TrxID BK9S4789X and Ref K7M4X2QH at ${new Date().toLocaleDateString('en-GB')}.`,
          sender: 'bKash',
          simSlot: 1,
          deviceId: superAdminDevice.id,
          battery: superAdminDevice.battery,
        },
        null,
        2
      ),
    },
    {
      id: 'create-payment',
      method: 'POST',
      path: '/api/v1/payments',
      title: 'Create Payment Session',
      description: 'Initialize a new checkout payment session with dedicated 8-character reference and offered MFS wallet pool numbers.',
      defaultHeaders: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${merchant.liveApiKey}`,
        'Idempotency-Key': `idemp_${Date.now()}`,
      },
      defaultBody: JSON.stringify(
        {
          planId: 'plan_pro_monthly',
          provider: 'bkash',
          orderId: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
          customerPhone: '01712750278',
        },
        null,
        2
      ),
    },
    {
      id: 'get-payment',
      method: 'GET',
      path: `/api/v1/payments/${payments[0]?.id || 'pay_01ha9x202'}`,
      title: 'Get Payment Status',
      description: 'Retrieve real-time payment reconciliation state, matched transaction details, and double-entry ledger status.',
      defaultHeaders: {
        'Authorization': `Bearer ${merchant.liveApiKey}`,
      },
    },
    {
      id: 'device-status',
      method: 'GET',
      path: '/api/v1/device/status',
      title: 'Super Admin Device Telemetry',
      description: 'Check connectivity status, active IP firewall verification, and SIM wallet bindings of the Super Admin terminal.',
      requiresIpWhitelist: true,
      defaultHeaders: {
        'X-Forwarder-Device-Token': superAdminDevice.token,
        'X-Forwarder-Client-IP': superAdminDevice.activeClientIp,
      },
    },
    {
      id: 'get-wallets',
      method: 'GET',
      path: '/api/v1/wallets/active',
      title: 'List Active MFS Wallets',
      description: 'Retrieve currently healthy MFS wallets in the pool with real-time concurrency counters and daily limit balances.',
      defaultHeaders: {
        'Authorization': `Bearer ${merchant.liveApiKey}`,
      },
    },
    {
      id: 'health',
      method: 'GET',
      path: '/health',
      title: 'Gateway Health & Ping',
      description: 'Public health check returning system uptime, database latency, and matching engine status.',
      defaultHeaders: {},
    },
  ];

  const [selectedEndpointId, setSelectedEndpointId] = useState<string>('sms-forward');
  const activeEndpoint = endpoints.find((e) => e.id === selectedEndpointId) || endpoints[0];

  const [requestHeaders, setRequestHeaders] = useState<Record<string, string>>(activeEndpoint.defaultHeaders);
  const [requestBody, setRequestBody] = useState<string>(activeEndpoint.defaultBody || '');
  const [isSending, setIsSending] = useState(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>({});
  const [responseJson, setResponseJson] = useState<any>(null);
  const [responseLatencyMs, setResponseLatencyMs] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync endpoint template on switch
  const handleSelectEndpoint = (ep: EndpointSpec) => {
    setSelectedEndpointId(ep.id);
    setRequestHeaders(ep.defaultHeaders);
    setRequestBody(ep.defaultBody || '');
    setResponseStatus(null);
    setResponseJson(null);
    setResponseLatencyMs(null);
  };

  const handleSendRequest = async () => {
    setIsSending(true);
    const start = performance.now();

    try {
      if (activeEndpoint.id === 'sms-forward') {
        const clientIp = requestHeaders['X-Forwarder-Client-IP'] || superAdminDevice.activeClientIp;
        const parsedBody = JSON.parse(requestBody);

        const result = await ingestForwardedSms(
          parsedBody.rawSms,
          parsedBody.sender || 'bKash',
          parsedBody.simSlot || 1,
          clientIp
        );

        const elapsed = Math.round(performance.now() - start) + 18;
        setResponseLatencyMs(elapsed);

        if (result.ipBlocked) {
          setResponseStatus(403);
          setResponseHeaders({
            'Content-Type': 'application/json',
            'X-Firewall-Status': 'BLOCKED',
            'X-Firewall-Rule': 'IP_WHITELIST_STRICT_ENFORCEMENT',
          });
          setResponseJson({
            statusCode: 403,
            error: 'Forbidden',
            message: `Client IP ${clientIp} is not authorized in Super Admin device firewall`,
            hint: 'Add this IP to the whitelist in Admin Portal > Device Tab',
            timestamp: new Date().toISOString(),
          });
        } else if (!result.parsed.isValid) {
          setResponseStatus(422);
          setResponseHeaders({ 'Content-Type': 'application/json' });
          setResponseJson({
            statusCode: 422,
            error: 'Unprocessable Entity',
            message: result.parsed.error || 'Failed to parse SMS format',
          });
        } else {
          setResponseStatus(200);
          setResponseHeaders({
            'Content-Type': 'application/json',
            'X-Firewall-Status': 'ALLOWED',
            'X-Matched-Payment': result.matchedPayment?.id || 'none',
          });
          setResponseJson({
            statusCode: 200,
            success: true,
            message: 'SMS forward accepted and processed',
            data: {
              parsed: result.parsed,
              matchedPayment: result.matchedPayment
                ? {
                    id: result.matchedPayment.id,
                    orderId: result.matchedPayment.orderId,
                    status: result.matchedPayment.status,
                    amountBDT: (result.matchedPayment.amountPaisa / 100).toFixed(2),
                    matchedBy: result.matchedPayment.matchedBy,
                  }
                : null,
              firewall: {
                verifiedIp: clientIp,
                enforced: superAdminDevice.isIpEnforced,
              },
            },
          });
        }
      } else if (activeEndpoint.id === 'create-payment') {
        const parsedBody = JSON.parse(requestBody);
        const newPayment = createPayment(
          parsedBody.planId || 'plan_pro_monthly',
          parsedBody.provider || 'bkash',
          parsedBody.orderId,
          parsedBody.customerPhone
        );

        const elapsed = Math.round(performance.now() - start) + 24;
        setResponseLatencyMs(elapsed);
        setResponseStatus(201);
        setResponseHeaders({ 'Content-Type': 'application/json' });
        setResponseJson({
          statusCode: 201,
          success: true,
          data: {
            paymentId: newPayment.id,
            orderId: newPayment.orderId,
            reference: newPayment.reference,
            amountBDT: (newPayment.amountPaisa / 100).toFixed(2),
            feeBDT: (newPayment.feeAmountPaisa / 100).toFixed(2),
            status: newPayment.status,
            expiresAt: newPayment.expiresAt,
            checkoutUrl: `https://merchant.example.com/pay/${newPayment.id}`,
          },
        });
      } else if (activeEndpoint.id === 'get-payment') {
        const payment = payments[0];
        const elapsed = Math.round(performance.now() - start) + 12;
        setResponseLatencyMs(elapsed);
        setResponseStatus(200);
        setResponseHeaders({ 'Content-Type': 'application/json' });
        setResponseJson({
          statusCode: 200,
          data: payment,
        });
      } else if (activeEndpoint.id === 'device-status') {
        const clientIp = requestHeaders['X-Forwarder-Client-IP'] || superAdminDevice.activeClientIp;
        const check = verifyClientIp(clientIp);

        const elapsed = Math.round(performance.now() - start) + 15;
        setResponseLatencyMs(elapsed);
        setResponseStatus(check.allowed ? 200 : 403);
        setResponseHeaders({ 'Content-Type': 'application/json' });
        setResponseJson({
          statusCode: check.allowed ? 200 : 403,
          deviceId: superAdminDevice.id,
          name: superAdminDevice.name,
          model: superAdminDevice.model,
          status: superAdminDevice.status,
          battery: `${superAdminDevice.battery}%`,
          lastPingAt: superAdminDevice.lastPingAt,
          firewall: {
            isIpEnforced: superAdminDevice.isIpEnforced,
            requestClientIp: clientIp,
            authorized: check.allowed,
            reason: check.reason,
            whitelistedIpsCount: superAdminDevice.whitelistedIps.length,
          },
          simSlots: {
            sim1: { provider: superAdminDevice.sim1Provider, msisdn: superAdminDevice.sim1Msisdn },
            sim2: { provider: superAdminDevice.sim2Provider, msisdn: superAdminDevice.sim2Msisdn },
          },
        });
      } else if (activeEndpoint.id === 'get-wallets') {
        const elapsed = Math.round(performance.now() - start) + 14;
        setResponseLatencyMs(elapsed);
        setResponseStatus(200);
        setResponseHeaders({ 'Content-Type': 'application/json' });
        setResponseJson({
          statusCode: 200,
          count: wallets.length,
          data: wallets.map((w) => ({
            id: w.id,
            provider: w.provider,
            msisdn: w.msisdn,
            holderName: w.holderName,
            status: w.status,
            activePendingCount: w.activePendingCount,
            currentBalanceBDT: (w.currentBalancePaisa / 100).toFixed(2),
          })),
        });
      } else if (activeEndpoint.id === 'health') {
        const elapsed = Math.round(performance.now() - start) + 8;
        setResponseLatencyMs(elapsed);
        setResponseStatus(200);
        setResponseHeaders({ 'Content-Type': 'application/json' });
        setResponseJson({
          status: 'ok',
          service: 'PayGate Bangladeshi MFS Gateway API',
          version: 'v4.0.0-fullstack',
          engine: 'Double-Entry Ledger & SMS Forwarder Ingest Engine',
          uptime: '99.98%',
          database: 'healthy',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      setResponseStatus(500);
      setResponseJson({ error: 'Internal Error', message: err.message || 'Execution error' });
    } finally {
      setIsSending(false);
    }
  };

  const curlSnippet = `curl -X ${activeEndpoint.method} "https://api.example.com${activeEndpoint.path}" \\
${Object.entries(requestHeaders)
  .map(([k, v]) => `  -H "${k}: ${v}"`)
  .join(' \\\n')}${activeEndpoint.defaultBody ? ` \\\n  -d '${requestBody.replace(/\n/g, '')}'` : ''}`;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col font-sans transition-colors">
      {/* Header bar */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)] px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[var(--ink)]">
                api.example.com — PayGate REST Sandbox
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">
                v1.4 Live
              </span>
            </div>
            <p className="text-xs text-[var(--ink-2)] mt-0.5">
              Interactive API playground with live MFS SMS ingestion, IP firewall verification, and payment session generation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <GateButton
            variant="secondary"
            size="sm"
            onClick={() => navigate('/admin')}
            icon={<ShieldCheck className="w-3.5 h-3.5" />}
          >
            Admin Device Controls
          </GateButton>
          <GateButton
            variant="secondary"
            size="sm"
            onClick={() => navigate('/merchant')}
            icon={<Globe className="w-3.5 h-3.5" />}
          >
            Merchant SaaS
          </GateButton>
        </div>
      </header>

      {/* Main Sandbox Grid */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-24">
        {/* Left column: Endpoints navigation */}
        <div className="lg:col-span-4 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-3)] block px-1">
            API Endpoints
          </span>

          <div className="space-y-1.5">
            {endpoints.map((ep) => {
              const isSelected = selectedEndpointId === ep.id;
              return (
                <button
                  key={ep.id}
                  onClick={() => handleSelectEndpoint(ep)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-[var(--surface)] border-[var(--accent)] shadow-xs ring-1 ring-[var(--accent)]/30'
                      : 'bg-[var(--surface)]/50 hover:bg-[var(--surface)] border-[var(--border)] text-[var(--ink-2)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                          ep.method === 'POST'
                            ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        }`}
                      >
                        {ep.method}
                      </span>
                      <span className="text-xs font-mono font-semibold text-[var(--ink)] truncate">
                        {ep.path}
                      </span>
                    </div>

                    {ep.requiresIpWhitelist && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0 font-medium"
                        title="Protected by IP Firewall"
                      >
                        IP Guard
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[var(--ink-3)] line-clamp-1">
                    {ep.title}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick status card on left */}
          <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--ink)]">Firewall State</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  superAdminDevice.isIpEnforced
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : 'bg-zinc-500/10 text-zinc-500'
                }`}
              >
                {superAdminDevice.isIpEnforced ? 'STRICT ENFORCEMENT' : 'PERMISSIVE'}
              </span>
            </div>
            <p className="text-[11px] text-[var(--ink-2)] leading-relaxed">
              Whitelisted IPs: <span className="font-mono font-bold text-[var(--ink)]">{superAdminDevice.whitelistedIps.join(', ')}</span>
            </p>
            <p className="text-[11px] text-[var(--ink-2)] leading-relaxed">
              Detected Client IP: <span className="font-mono font-bold text-[var(--accent)]">{superAdminDevice.activeClientIp}</span>
            </p>
          </div>
        </div>

        {/* Right column: Interactive Request / Response Panel */}
        <div className="lg:col-span-8 space-y-4">
          {/* Endpoint Card Title */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-md font-mono ${
                    activeEndpoint.method === 'POST'
                      ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                  }`}
                >
                  {activeEndpoint.method}
                </span>
                <span className="text-sm font-mono font-bold text-[var(--ink)]">
                  https://api.example.com{activeEndpoint.path}
                </span>
              </div>

              <GateButton
                variant="primary"
                size="sm"
                onClick={handleSendRequest}
                isLoading={isSending}
                icon={<Send className="w-3.5 h-3.5" />}
              >
                Send Request
              </GateButton>
            </div>

            <p className="text-xs text-[var(--ink-2)] leading-relaxed">
              {activeEndpoint.description}
            </p>

            {/* Request Headers configuration */}
            <div className="space-y-2 pt-2 border-t border-[var(--border)]">
              <span className="text-xs font-bold text-[var(--ink)] block">
                Request Headers
              </span>
              <div className="space-y-1.5 font-mono text-xs">
                {Object.entries(requestHeaders).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-[var(--ink-3)] w-48 shrink-0 truncate">{key}:</span>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) =>
                        setRequestHeaders((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Request Body if POST */}
            {activeEndpoint.method === 'POST' && (
              <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--ink)]">
                    JSON Request Body
                  </span>
                  <span className="text-[11px] font-mono text-[var(--ink-3)]">application/json</span>
                </div>
                <textarea
                  rows={7}
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-3 text-xs font-mono text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] leading-relaxed"
                />
              </div>
            )}
          </div>

          {/* Response Output Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[var(--ink)]">Response</span>
                {responseStatus !== null && (
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                      responseStatus >= 200 && responseStatus < 300
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : responseStatus === 403
                        ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                    }`}
                  >
                    {responseStatus} {responseStatus === 200 ? 'OK' : responseStatus === 201 ? 'Created' : responseStatus === 403 ? 'Forbidden' : 'Error'}
                  </span>
                )}
                {responseLatencyMs !== null && (
                  <span className="text-[11px] font-mono text-[var(--ink-3)]">
                    {responseLatencyMs}ms
                  </span>
                )}
              </div>

              {responseJson && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(responseJson, null, 2));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="text-xs text-[var(--ink-3)] hover:text-[var(--ink)] flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[var(--success)]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
              )}
            </div>

            {responseJson ? (
              <pre className="p-4 rounded-xl bg-zinc-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-96 leading-relaxed">
                {JSON.stringify(responseJson, null, 2)}
              </pre>
            ) : (
              <div className="p-8 rounded-xl bg-[var(--surface-2)]/50 border border-dashed border-[var(--border)] text-center text-xs text-[var(--ink-3)] space-y-1">
                <Terminal className="w-6 h-6 mx-auto text-[var(--ink-3)] opacity-60" />
                <p>Click "Send Request" to test this endpoint against the PayGate engine.</p>
              </div>
            )}
          </div>

          {/* cURL Snippet */}
          <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-2">
            <span className="text-xs font-bold text-[var(--ink)] block">
              cURL Command Generator
            </span>
            <pre className="p-3 rounded-lg bg-zinc-950 text-zinc-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
              {curlSnippet}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
