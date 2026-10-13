/**
 * @paygate/domain - Money & Paisa Module
 * Integer-only paisa arithmetic with nominal branding to prevent float precision errors.
 */

export type Paisa = number & { readonly __brand: unique symbol };

export function toPaisa(amount: number): Paisa {
  if (isNaN(amount) || !isFinite(amount)) {
    throw new TypeError(`Invalid paisa amount: ${amount}`);
  }
  return Math.round(amount) as Paisa;
}

export function bdtToPaisa(bdt: number): Paisa {
  return toPaisa(bdt * 100);
}

export function paisaToBdt(paisa: Paisa | number): number {
  return (paisa as number) / 100;
}

export function parseAmountStringToPaisa(amountStr: string): Paisa {
  if (!amountStr) return toPaisa(0);
  const cleaned = amountStr.replace(/[^0-9.]/g, '');
  const floatVal = parseFloat(cleaned);
  if (isNaN(floatVal)) return toPaisa(0);
  return toPaisa(floatVal * 100);
}

export function formatPaisaToBDT(paisa: Paisa | number): string {
  const tk = ((paisa as number) / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `Tk ${tk}`;
}

export function addPaisa(a: Paisa, b: Paisa): Paisa {
  return toPaisa((a as number) + (b as number));
}

export function subPaisa(a: Paisa, b: Paisa): Paisa {
  return toPaisa((a as number) - (b as number));
}

export function formatBDTAmountOnly(paisa: Paisa | number): string {
  return ((paisa as number) / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function calculateFeeAndNet(
  grossPaisa: Paisa | number,
  feeRateBps: number
): { feePaisa: Paisa; netPaisa: Paisa } {
  const gross = grossPaisa as number;
  const feePaisa = toPaisa(Math.round((gross * feeRateBps) / 10000));
  const netPaisa = toPaisa(gross - (feePaisa as number));
  return { feePaisa, netPaisa };
}

