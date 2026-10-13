import { ProviderAdapter, ParsedSmsResult } from './types.ts';
import { parseAmountStringToPaisa } from '../money.ts';
import { normalizeReference } from '../reference.ts';

export const upayAdapter: ProviderAdapter = {
  provider: 'upay',
  allowedSenders: ['upay', '16268', 'ucb'],

  detect(text: string, sender: string): boolean {
    const s = sender.toLowerCase();
    const t = text.toLowerCase();
    return s.includes('upay') || s.includes('16268') || s.includes('ucb') || t.includes('upay');
  },

  validateTrxId(trxId: string): { isValid: boolean; message?: string } {
    const clean = trxId.trim().toUpperCase();
    if (!clean) return { isValid: false, message: 'Upay TrxID is required' };
    const valid = /^[A-Z0-9]{8,12}$/.test(clean);
    return valid
      ? { isValid: true }
      : { isValid: false, message: 'Upay TrxID is typically 8-12 alphanumeric characters (e.g. UP84920183)' };
  },

  parse(rawText: string, sender: string, simSlot: 1 | 2 = 1): ParsedSmsResult {
    const text = rawText.trim();
    let amountPaisa = 0;
    let trxId = '';
    let refRaw = '';
    let balanceAfterPaisa = 0;

    // e.g. "You have received Tk 1,200.00 from 01712750278. TrxID UP84920183 and Ref K7M4X2QH. Fee Tk 0.00. Balance Tk 18,400.00."
    const amountMatch = text.match(/(?:received|amount)\s*(?:Tk\.?)?\s*([0-9,]+(?:\.[0-9]{2})?)/i) ||
                        text.match(/Tk\.?\s*([0-9,]+(?:\.[0-9]{2})?)\s*(?:from|received)/i);
    if (amountMatch) amountPaisa = parseAmountStringToPaisa(amountMatch[1]) as number;

    const trxMatch = text.match(/(?:TrxID|TxnID|ID)\s*[:\s]?\s*([A-Za-z0-9]+)/i);
    if (trxMatch) trxId = trxMatch[1].trim().toUpperCase();

    const refMatch = text.match(/Ref\s*[:\s]?\s*([A-Za-z0-9_-]+)/i);
    if (refMatch) refRaw = refMatch[1].trim();

    const balanceMatch = text.match(/Balance\s*(?:Tk\.?)?\s*([0-9,]+(?:\.[0-9]{2})?)/i);
    if (balanceMatch) balanceAfterPaisa = parseAmountStringToPaisa(balanceMatch[1]) as number;

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
      provider: 'upay',
      trxId,
      amountPaisa,
      balanceAfterPaisa,
      refRaw,
      refNormalized,
      sender: sender || 'Upay',
      simSlot,
      timestamp,
      rawSms: text,
      isValid,
      error: isValid ? undefined : 'Could not parse Upay received amount or TrxID',
    };
  },
};
