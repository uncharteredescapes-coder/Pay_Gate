/**
 * @paygate/domain - Webhook HMAC-SHA256 Signer & Verification Utility
 * Specification: PayGate-Signature: t=<unix>,v1=<hex>
 */

import { timingSafeEqualStr } from './device.ts';

export async function signWebhookPayload(
  secret: string,
  rawBody: string,
  timestampUnix?: number
): Promise<{ signatureHeader: string; timestamp: number; hashHex: string }> {
  const t = timestampUnix ?? Math.floor(Date.now() / 1000);
  const dataToSign = `${t}.${rawBody}`;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(dataToSign);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return {
    signatureHeader: `t=${t},v1=${hashHex}`,
    timestamp: t,
    hashHex,
  };
}

export async function verifyWebhookSignature(
  header: string,
  rawBody: string,
  secret: string,
  toleranceSeconds: number = 300
): Promise<{ isValid: boolean; reason?: string }> {
  if (!header) return { isValid: false, reason: 'Missing PayGate-Signature header' };

  const parts = header.split(',');
  const tPart = parts.find((p) => p.startsWith('t='));
  const v1Part = parts.find((p) => p.startsWith('v1='));

  if (!tPart || !v1Part) {
    return { isValid: false, reason: 'Malformed PayGate-Signature header format (expected t=...,v1=...)' };
  }

  const timestamp = parseInt(tPart.split('=')[1], 10);
  const providedHash = v1Part.split('=')[1];

  if (isNaN(timestamp) || !providedHash) {
    return { isValid: false, reason: 'Invalid signature timestamp or hash values' };
  }

  const nowUnix = Math.floor(Date.now() / 1000);
  if (Math.abs(nowUnix - timestamp) > toleranceSeconds) {
    return {
      isValid: false,
      reason: `Signature timestamp expired or out of tolerance (drift: ${Math.abs(nowUnix - timestamp)}s)`,
    };
  }

  const expected = await signWebhookPayload(secret, rawBody, timestamp);
  if (!timingSafeEqualStr(expected.hashHex.toLowerCase(), providedHash.toLowerCase())) {
    return { isValid: false, reason: 'HMAC-SHA256 signature verification failed' };
  }

  return { isValid: true };
}
