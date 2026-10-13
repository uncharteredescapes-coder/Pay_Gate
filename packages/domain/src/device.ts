/**
 * @paygate/domain - Cryptographic Device Signing & Anti-Replay Defense
 */

export function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export interface DeviceSignPayload {
  deviceId: string;
  seqNo: number;
  timestamp: number;
  rawSms: string;
}

export async function computeDeviceSignature(
  secretKey: string,
  payload: DeviceSignPayload
): Promise<string> {
  const canonicalString = `${payload.deviceId}:${payload.seqNo}:${payload.timestamp}:${payload.rawSms}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const messageData = encoder.encode(canonicalString);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyDeviceIngestSignature(
  secretKey: string,
  lastRecordedSeqNo: number,
  payload: DeviceSignPayload,
  providedSignature: string,
  toleranceSeconds: number = 300
): Promise<{ isValid: boolean; reason?: string }> {
  if (payload.seqNo <= lastRecordedSeqNo) {
    return {
      isValid: false,
      reason: `Anti-replay violation: Sequence number ${payload.seqNo} is not greater than last recorded sequence ${lastRecordedSeqNo}.`,
    };
  }

  const currentUnix = Math.floor(Date.now() / 1000);
  if (Math.abs(currentUnix - payload.timestamp) > toleranceSeconds) {
    return {
      isValid: false,
      reason: `Timestamp drift exceeded: Packet timestamp differs by ${Math.abs(currentUnix - payload.timestamp)}s (max ${toleranceSeconds}s).`,
    };
  }

  const expectedSignature = await computeDeviceSignature(secretKey, payload);
  if (!timingSafeEqualStr(expectedSignature.toLowerCase(), providedSignature.toLowerCase())) {
    return {
      isValid: false,
      reason: 'Cryptographic signature mismatch: Device payload has been tampered with or secret is invalid.',
    };
  }

  return { isValid: true };
}
