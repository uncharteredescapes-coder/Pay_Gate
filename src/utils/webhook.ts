/**
 * PayGate Webhook HMAC-SHA256 Signer & Verification Utility
 * Re-exports domain cryptographic signatures and provides HTTP dispatching.
 */

export * from '../../packages/domain/src/webhook.ts';
import { signWebhookPayload } from '../../packages/domain/src/webhook.ts';

/**
 * Real HTTP Webhook Dispatcher with timeout
 */
export async function dispatchRealWebhook(
  url: string,
  payload: any,
  secret: string,
  timeoutMs: number = 5000
): Promise<{ success: boolean; statusCode: number; responseText?: string; error?: string }> {
  const rawBody = JSON.stringify(payload);
  const { signatureHeader } = await signWebhookPayload(secret, rawBody);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PayGate-Webhook-Dispatcher/4.0',
        'PayGate-Signature': signatureHeader,
      },
      body: rawBody,
      signal: controller.signal,
    });
    clearTimeout(timer);
    const text = await res.text();
    return {
      success: res.ok,
      statusCode: res.status,
      responseText: text.slice(0, 500),
    };
  } catch (err: any) {
    clearTimeout(timer);
    return {
      success: false,
      statusCode: 0,
      error: err.name === 'AbortError' ? 'Webhook delivery timed out after 5s' : err.message || 'Network request failed',
    };
  }
}
