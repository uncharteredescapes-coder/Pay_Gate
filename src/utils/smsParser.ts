/**
 * PayGate MFS SMS Ingest & Parser Engine
 * Backed by @paygate/domain provider adapters and pure rules.
 */

import {
  parseSmsWithAdapters,
  validateTrxIdForProvider,
  ALL_PROVIDER_ADAPTERS,
  formatPaisaToBDT as domainFormatPaisaToBDT,
  formatBDTAmountOnly as domainFormatBDTAmountOnly,
  parseAmountStringToPaisa,
  ProviderType,
} from '../../packages/domain/src/index.ts';
import { ParsedSmsResult } from '../types/index.ts';

export const ALLOWED_MFS_SENDERS = [
  'bkash', '16247',
  'nagad', '16167',
  'rocket', '16216', 'dbbl',
  'upay', '16268', 'ucb',
  'cellfin', 'ibbl', '16259',
];

export function parseAmountToPaisa(amountStr: string): number {
  return parseAmountStringToPaisa(amountStr) as number;
}

export function formatPaisaToBDT(paisa: number): string {
  return domainFormatPaisaToBDT(paisa);
}

export function formatBDTAmountOnly(paisa: number): string {
  return domainFormatBDTAmountOnly(paisa);
}

export function validateTrxIdFormat(
  trxId: string,
  provider: ProviderType
): { isValid: boolean; message?: string } {
  return validateTrxIdForProvider(trxId, provider);
}

export function parseIncomingSms(
  rawBody: string,
  sender: string = '',
  simSlot: 1 | 2 = 1
): ParsedSmsResult {
  return parseSmsWithAdapters(rawBody, sender, simSlot) as ParsedSmsResult;
}
