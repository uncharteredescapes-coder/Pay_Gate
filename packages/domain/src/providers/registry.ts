import { ProviderAdapter, ParsedSmsResult, ProviderType } from './types.ts';
import { bkashAdapter } from './bkash.ts';
import { nagadAdapter } from './nagad.ts';
import { rocketAdapter } from './rocket.ts';
import { upayAdapter } from './upay.ts';
import { cellfinAdapter } from './cellfin.ts';

export const ALL_PROVIDER_ADAPTERS: ProviderAdapter[] = [
  bkashAdapter,
  nagadAdapter,
  rocketAdapter,
  upayAdapter,
  cellfinAdapter,
];

export const ADAPTER_BY_PROVIDER: Record<ProviderType, ProviderAdapter> = {
  bkash: bkashAdapter,
  nagad: nagadAdapter,
  rocket: rocketAdapter,
  upay: upayAdapter,
  cellfin: cellfinAdapter,
};

/**
 * Finds matching provider adapter based on sender or text content without fallback
 */
export function findAdapter(text: string, sender: string): ProviderAdapter | null {
  for (const adapter of ALL_PROVIDER_ADAPTERS) {
    if (adapter.detect(text, sender)) {
      return adapter;
    }
  }
  return null;
}

/**
 * Parses incoming SMS text via matching provider adapter; returns error result if unrecognized
 */
export function parseSmsWithAdapters(
  rawText: string,
  sender: string = '',
  simSlot: 1 | 2 = 1
): ParsedSmsResult {
  const adapter = findAdapter(rawText, sender);
  if (!adapter) {
    return {
      provider: 'bkash',
      trxId: '',
      amountPaisa: 0,
      sender: sender || 'UNKNOWN',
      simSlot,
      timestamp: new Date().toISOString(),
      rawSms: rawText,
      isValid: false,
      error: 'Unrecognized provider format. No matching adapter for sender and message body.',
    };
  }

  return adapter.parse(rawText, sender, simSlot);
}

export function validateTrxIdForProvider(
  trxId: string,
  provider: ProviderType
): { isValid: boolean; message?: string } {
  const adapter = ADAPTER_BY_PROVIDER[provider];
  if (!adapter) return { isValid: false, message: `Unknown provider "${provider}"` };
  return adapter.validateTrxId(trxId);
}
