/**
 * @paygate/domain - Reference Generator and Polynomial Check Validator
 * 8-character charset avoiding lookalikes (0/O, 1/I/L) with prime-weighted modulo-31 checksum.
 */

export const REFERENCE_CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CHARSET_MAP = new Map<string, number>();
for (let i = 0; i < REFERENCE_CHARSET.length; i++) {
  CHARSET_MAP.set(REFERENCE_CHARSET[i], i);
}

export function normalizeReference(raw: string): string {
  if (!raw) return '';
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim();
}

export function computeCheckChar(base7: string): string {
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const char = base7[i];
    const val = CHARSET_MAP.get(char) ?? 0;
    const weight = ((i * 3) + 7) % 31 + 1;
    sum = (sum + val * weight) % 31;
  }
  return REFERENCE_CHARSET[sum % REFERENCE_CHARSET.length];
}

export function generateReference(): string {
  let base7 = '';
  const randomBytes = new Uint8Array(7);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < 7; i++) randomBytes[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < 7; i++) {
    const randIdx = randomBytes[i] % REFERENCE_CHARSET.length;
    base7 += REFERENCE_CHARSET[randIdx];
  }
  const checkChar = computeCheckChar(base7);
  return `${base7}${checkChar}`;
}

export function validateReference(ref: string): { isValid: boolean; normalized: string; error?: string } {
  if (!ref) return { isValid: false, normalized: '', error: 'Reference cannot be empty' };

  const cleaned = ref.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length !== 8) {
    return {
      isValid: false,
      normalized: cleaned,
      error: `Reference must be exactly 8 characters (received ${cleaned.length})`,
    };
  }

  for (let i = 0; i < 8; i++) {
    if (!CHARSET_MAP.has(cleaned[i])) {
      return {
        isValid: false,
        normalized: cleaned,
        error: `Reference contains invalid character "${cleaned[i]}" (lookalikes 0, O, 1, I, L not permitted)`,
      };
    }
  }

  const base7 = cleaned.slice(0, 7);
  const actualCheck = cleaned[7];
  const expectedCheck = computeCheckChar(base7);

  if (actualCheck !== expectedCheck) {
    return {
      isValid: false,
      normalized: cleaned,
      error: 'Reference check character failed. Please check for a typo.',
    };
  }

  return { isValid: true, normalized: cleaned };
}
