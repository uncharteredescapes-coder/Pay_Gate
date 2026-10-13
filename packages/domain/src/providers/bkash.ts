import { ProviderAdapter, ParsedSmsResult } from './types.ts';
import { parseAmountStringToPaisa } from '../money.ts';
import { normalizeReference } from '../reference.ts';

export const bkashAdapter: ProviderAdapter = {
  provider: 'bkash',
  allowedSenders: ['bkash', '16247'],

  detect(text: string, sender: string): boolean {
    const s = sender.toLowerCase();
    const t = text.toLowerCase();
    if (s.includes('upay') || s.includes('16268') || s.includes('ucb') ||
        s.includes('cellfin') || s.includes('ibbl') || s.includes('16259') ||
        s.includes('nagad') || s.includes('16167') ||
        s.includes('rocket') || s.includes('16216') || s.includes('dbbl')) {
      return false;
    }
    return s.includes('bkash') || s.includes('16247') || t.includes('bkash');
  },

  validateTrxId(trxId: string): { isValid: boolean; message?: string } {
    const clean = trxId.trim().toUpperCase();
    if (!clean) return { isValid: false, message: 'bKash TrxID is required' };
    const valid = /^[A-Z0-9]{8,12}$/.test(clean);
    return valid
      ? { isValid: true }
      : { isValid: false, message: 'bKash TrxID is typically 10 alphanumeric characters (e.g. DJC9SZQV0J)' };
  },

  parse(rawText: string, sender: string, simSlot: 1 | 2 = 1): ParsedSmsResult {
    const text = rawText.trim();
    let amountPaisa = 0;
    let trxId = '';
    let refRaw = '';
    let balanceAfterPaisa = 0;

    // e.g. "You have received Tk 1,200.00 from 01712750278. Fee Tk 0.00. Balance Tk 14,500.00. TrxID DJC9SZQV0J and Ref K7M4X2QH at 12/10/2026 15:24."
    const amountMatch = text.match(/(?:received|amount)\s*(?:Tk\.?)?\s*([0-9,]+(?:\.[0-9]{2})?)/i) ||
                        text.match(/Tk\.?\s*([0-9,]+(?:\.[0-9]{2})?)\s*(?:from|received)/i);
    if (amountMatch) amountPaisa = parseAmountStringToPaisa(amountMatch[1]) as number;

    const trxMatch = text.match(/TrxID\s*[:\s]?\s*([A-Za-z0-9]+)/i);
    if (trxMatch) trxId = trxMatch[1].trim().toUpperCase();

    const refMatch = text.match(/Ref\s*[:\s]?\s*([A-Za-z0-9_-]+)/i);
    if (refMatch) refRaw = refMatch[1].trim();

    const balanceMatch = text.match(/Balance\s*(?:Tk\.?)?\s*([0-9,]+(?:\.[0-9]{2})?)/i);
    if (balanceMatch) balanceAfterPaisa = parseAmountStringToPaisa(balanceMatch[1]) as number;

    // Date/time extraction
    let timestamp = new Date().toISOString();
    const dateMatch = text.match(/at\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\s+\d{1,2}:\d{2})/i);
    if (dateMatch) {
      try {
        const d = new Date(dateMatch[1].replace(/-/g, '/'));
        if (!isNaN(d.getTime())) timestamp = d.toISOString();
      } catch {}
    }

    const refNormalized = refRaw ? normalizeReference(refRaw) : '';
    const isValid = amountPaisa > 0 && trxId.length > 0;

    return {
      provider: 'bkash',
      trxId,
      amountPaisa,
      balanceAfterPaisa,
      refRaw,
      refNormalized,
      sender: sender || 'bKash',
      simSlot,
      timestamp,
      rawSms: text,
      isValid,
      error: isValid ? undefined : 'Could not parse bKash received amount or TrxID',
    };
  },
};
