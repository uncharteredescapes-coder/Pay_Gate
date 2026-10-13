/**
 * @paygate/domain - Golden SMS Fixtures
 * Captured representative messages across bKash, Nagad, Rocket, Upay, and Cellfin.
 */

export interface GoldenFixture {
  provider: 'bkash' | 'nagad' | 'rocket' | 'upay' | 'cellfin';
  sender: string;
  rawSms: string;
  expectedAmountPaisa: number;
  expectedTrxId: string;
  expectedRef?: string;
  expectedBalancePaisa?: number;
}

export const GOLDEN_SMS_FIXTURES: GoldenFixture[] = [
  {
    provider: 'bkash',
    sender: 'bKash',
    rawSms: 'You have received Tk 1,200.00 from 01712750278. Fee Tk 0.00. Balance Tk 14,500.00. TrxID DJC9SZQV0J and Ref K7M4X2QH at 12/10/2026 15:24.',
    expectedAmountPaisa: 120000,
    expectedTrxId: 'DJC9SZQV0J',
    expectedRef: 'K7M4X2QH',
    expectedBalancePaisa: 1450000,
  },
  {
    provider: 'nagad',
    sender: 'Nagad',
    rawSms: 'Tk 1,200.00 received from 01812345678. TxnID 74BK992Q at 12/10/2026 15:24. Ref: K7M4X2QH. Balance: Tk 14,500.00.',
    expectedAmountPaisa: 120000,
    expectedTrxId: '74BK992Q',
    expectedRef: 'K7M4X2QH',
    expectedBalancePaisa: 1450000,
  },
  {
    provider: 'rocket',
    sender: '16216',
    rawSms: 'Cash In Tk 1,200.00 from 01912345678 received. TxnId: 9845728190, Ref: K7M4X2QH. A/C Balance: Tk 14,500.00.',
    expectedAmountPaisa: 120000,
    expectedTrxId: '9845728190',
    expectedRef: 'K7M4X2QH',
    expectedBalancePaisa: 1450000,
  },
  {
    provider: 'upay',
    sender: 'Upay',
    rawSms: 'You have received Tk 1,200.00 from 01712750278. TrxID UP84920183 and Ref K7M4X2QH. Fee Tk 0.00. Balance Tk 18,400.00. 12/10/2026 15:24',
    expectedAmountPaisa: 120000,
    expectedTrxId: 'UP84920183',
    expectedRef: 'K7M4X2QH',
    expectedBalancePaisa: 1840000,
  },
  {
    provider: 'cellfin',
    sender: 'Cellfin',
    rawSms: 'Payment received Tk 1,200.00 from Cellfin A/C 01712750278. Trx ID CF98234190. Ref: K7M4X2QH. Available Bal Tk 25,600.00.',
    expectedAmountPaisa: 120000,
    expectedTrxId: 'CF98234190',
    expectedRef: 'K7M4X2QH',
    expectedBalancePaisa: 2560000,
  },
];
