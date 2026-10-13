import { ProviderAdapter, ParsedSmsResult } from './types.ts';
import { parseAmountStringToPaisa } from '../money.ts';
import { normalizeReference } from '../reference.ts';

export const rocketAdapter: ProviderAdapter = {
  provider: 'rocket',
  allowedSenders: ['16216', 'rocket', 'dbbl'],

  detect(text: string, sender: string): boolean {
    const s = sender.toLowerCase();
    const t = text.toLowerCase();
    return s.includes('16216') || s.includes('rocket') || s.includes('dbbl') || (t.includes('rocket') && t.includes('txnid')) || t.includes('a/c balance');
  },

  validateTrxId(trxId: string): { isValid: boolean; message?: string } {
    const clean = trxId.trim().toUpperCase();
    if (!clean) return { isValid: false, message: 'Rocket TxnId is required' };
    const valid = /^[A-Z0-9]{8,12}$/.test(clean);
    return valid
      ? { isValid: true }
      : { isValid: false, message: 'Rocket TxnId is typically 8-10 digits or alphanumeric (e.g. 9845728190)' };
  },

  parse(rawText: string, sender: string, simSlot: 1 | 2 = 1): ParsedSmsResult {
    const text = rawText.trim();
    let amountPaisa = 0;
    let trxId = '';
    let refRaw = '';
    let balanceAfterPaisa = 0;

    // e.g. "Cash In Tk 1,200.00 from 01912345678 received. TxnId: 9845728190, Ref: K7M4X2QH. A/C Balance: Tk 14,500.00."
    // Specifically target Cash In or received amount and ignore A/C Balance
    const amountMatch = text.match(/(?:Cash\s*In|received|amount)\s*(?:Tk\.?)?\s*([0-9,]+(?:\.[0-9]{2})?)/i) ||
                        text.match(/Tk\.?\s*([0-9,]+(?:\.[0-9]{2})?)\s*(?:received|from)/i);
    if (amountMatch) amountPaisa = parseAmountStringToPaisa(amountMatch[1]) as number;

    const txnMatch = text.match(/(?:TxnId|TrxId|TxnID|Txn\s*Id)\s*[:\s]?\s*([A-Za-z0-9]+)/i);
    if (txnMatch) trxId = txnMatch[1].trim().toUpperCase();

    const refMatch = text.match(/Ref\s*[:\s]?\s*([A-Za-z0-9_-]+)/i);
    if (refMatch) refRaw = refMatch[1].trim();

    const balanceMatch = text.match(/(?:A\/C Balance|Balance)\s*[:\s]?(?:Tk\.?)?\s*([0-9,]+(?:\.[0-9]{2})?)/i);
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
      provider: 'rocket',
      trxId,
      amountPaisa,
      balanceAfterPaisa,
      refRaw,
      refNormalized,
      sender: sender || '16216',
      simSlot,
      timestamp,
      rawSms: text,
      isValid,
      error: isValid ? undefined : 'Could not parse Rocket cash-in amount or TxnId',
    };
  },
};
