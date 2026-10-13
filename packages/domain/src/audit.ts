/**
 * @paygate/domain - Tamper-Evident Hash-Chained Audit Log
 */

export interface ChainedAuditLogEntry {
  id: string;
  sequence: number;
  actor: string;
  role: 'merchant' | 'admin' | 'developer' | 'system';
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  ip: string;
  createdAt: string;
  previousHash: string;
  entryHash: string;
}

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export async function computeAuditEntryHash(
  previousHash: string,
  sequence: number,
  actor: string,
  action: string,
  details: string,
  createdAt: string
): Promise<string> {
  const content = `${previousHash}:${sequence}:${actor}:${action}:${details}:${createdAt}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createChainedAuditEntry(
  actor: string,
  role: 'merchant' | 'admin' | 'developer' | 'system',
  action: string,
  entityType: string,
  entityId: string,
  details: string,
  ip: string,
  lastEntry?: ChainedAuditLogEntry
): Promise<ChainedAuditLogEntry> {
  const sequence = lastEntry ? lastEntry.sequence + 1 : 1;
  const previousHash = lastEntry ? lastEntry.entryHash : GENESIS_HASH;
  const createdAt = new Date().toISOString();
  const id = `aud_${Date.now()}_${sequence}`;

  const entryHash = await computeAuditEntryHash(
    previousHash,
    sequence,
    actor,
    action,
    details,
    createdAt
  );

  return {
    id,
    sequence,
    actor,
    role,
    action,
    entityType,
    entityId,
    details,
    ip,
    createdAt,
    previousHash,
    entryHash,
  };
}

export async function verifyAuditChain(entries: ChainedAuditLogEntry[]): Promise<{
  isValid: boolean;
  brokenIndex?: number;
  reason?: string;
}> {
  if (entries.length === 0) return { isValid: true };

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const expectedPrev = i === 0 ? GENESIS_HASH : entries[i - 1].entryHash;

    if (entry.previousHash !== expectedPrev) {
      return {
        isValid: false,
        brokenIndex: i,
        reason: `Previous hash mismatch at index ${i}`,
      };
    }

    const recomputedHash = await computeAuditEntryHash(
      entry.previousHash,
      entry.sequence,
      entry.actor,
      entry.action,
      entry.details,
      entry.createdAt
    );

    if (recomputedHash !== entry.entryHash) {
      return {
        isValid: false,
        brokenIndex: i,
        reason: `Hash integrity verification failed at index ${i}`,
      };
    }
  }

  return { isValid: true };
}
