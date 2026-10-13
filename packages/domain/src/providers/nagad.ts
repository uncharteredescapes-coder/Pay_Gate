import { ProviderAdapter, ParsedSmsResult } from './types.ts';
import { parseAmountStringToPaisa } from '../money.ts';
import { normalizeReference } from '../reference.ts';

export const nagadAdapter: ProviderAdapter = {
  provider: 'nagad',
  allowedSenders: ['nagad', '16167'],

  detect(text: string, sender: string): boolean {
    const s = sender.toLowerCase();
    const t = text.toLowerCase();
    return s.includes('nagad') || s.includes('16167') || t.includes('nagad') || (t.includes('txnid') && t.includes('received from'));
  },

  validateTrxId(trxId: string): { isValid: boolean; message?: string } {
    const clean = trxId.trim().toUpperCase();
    if (!clean) return { isValid: false, message: 'Nagad TxnID is required' };
    const valid = /^[A-Z0-9]{8,12}$/.test(clean);
    return valid
      ? { isValid: true }
      : { isValid: false, message: 'Nagad TxnID is typically 8-10 alphanumeric characters (e.g. 74BK992Q)' };
  },

  parse(rawText: string, sender: string, simSlot: 1 | 2 = 1): ParsedSmsResult {
    const text = rawText.trim();
    let amountPaisa = 0;
    let trxId = '';
    let refRaw = '';
    let balanceAfterPaisa = 0;

    // e.g. "Tk 1,200.00 received from 01812345678. TxnID 74BK992Q at 12/10/2026 15:24. Ref: K7M4X2QH. Balance: Tk 14,500.00."
    const amountMatch = text.match(/Tk\s*([0-9,]+(?:\.[0-9]{2})?)\s*received/i) ||
                        text.match(/(?:received|amount)\s*(?:Tk\.?)?\s*([0-9,]+(?:\.[0-9]{2})?)/i);
    if (amountMatch) amountPaisa = parseAmountStringToPaisa(amountMatch[1]) as number;

    const txnMatch = text.match(/(?:TxnID|TrxID|Txn\s*ID)\s*[:\s]?\s*([A-Za-z0-9]+)/i);
    if (txnMatch) trxId = txnMatch[1].trim().toUpperCase();

    const refMatch = text.match(/Ref\s*[:\s]?\s*([A-Za-z0-9_-]+)/i);
    if (refMatch) refRaw = refMatch[1].trim();

    const balanceMatch = text.match(/Balance\s*[:\s]?(?:Tk\.?)?\s*([0-9,]+(?:\.[0-9]{2})?)/i);
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
      provider: 'nagad',
      trxId,
      amountPaisa,
      balanceAfterPaisa,
      refRaw,
      refNormalized,
      sender: sender || 'Nagad',
      simSlot,
      timestamp,
      rawSms: text,
      isValid,
      error: isValid ? undefined : 'Could not parse Nagad received amount or TxnID',
    };
  },
};
