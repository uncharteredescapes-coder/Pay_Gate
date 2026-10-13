export type ProviderType = 'bkash' | 'nagad' | 'rocket' | 'upay' | 'cellfin';

export interface ParsedSmsResult {
  provider: ProviderType;
  trxId: string;
  amountPaisa: number;
  balanceAfterPaisa?: number;
  refRaw?: string;
  refNormalized?: string;
  rawSms?: string;
  sender: string;
  simSlot: 1 | 2;
  timestamp: string;
  isValid: boolean;
  error?: string;
}

export interface ProviderAdapter {
  readonly provider: ProviderType;
  readonly allowedSenders: readonly string[];
  detect(text: string, sender: string): boolean;
  parse(text: string, sender: string, simSlot?: 1 | 2): ParsedSmsResult;
  validateTrxId(trxId: string): { isValid: boolean; message?: string };
}
