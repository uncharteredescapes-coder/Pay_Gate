/**
 * @paygate/domain - Self-Contained Test Suite for Domain Rules
 * Validates money branding, transitions, reference checksums, and golden SMS fixtures.
 */

import { toPaisa, formatPaisaToBDT, calculateFeeAndNet } from './money.ts';
import { canTransitionPayment, assertValidPaymentTransition } from './transitions.ts';
import { generateReference, validateReference, normalizeReference } from './reference.ts';
import { GOLDEN_SMS_FIXTURES } from './providers/fixtures.ts';
import { parseSmsWithAdapters } from './providers/registry.ts';

export function runDomainTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(`FAIL: ${testName}`);
    }
  }

  // 1. Money Math Tests
  try {
    const p = toPaisa(120000);
    assert(p === 120000, 'toPaisa handles integer paisa');
    assert(formatPaisaToBDT(p) === 'Tk 1,200.00', 'formatPaisaToBDT formats integer BDT');
    const { feePaisa, netPaisa } = calculateFeeAndNet(p, 500); // 5% fee
    assert(feePaisa === 6000, '5% fee on 120000 paisa is 6000');
    assert(netPaisa === 114000, 'net on 120000 paisa is 114000');
  } catch (err: any) {
    failed++;
    errors.push(`Money test exception: ${err.message}`);
  }

  // 2. State Transition Tests
  try {
    assert(canTransitionPayment('created', 'awaiting_payment'), 'created -> awaiting_payment is allowed');
    assert(canTransitionPayment('awaiting_payment', 'confirming'), 'awaiting_payment -> confirming is allowed');
    assert(canTransitionPayment('confirming', 'paid'), 'confirming -> paid is allowed');
    assert(!canTransitionPayment('paid', 'awaiting_payment'), 'paid -> awaiting_payment is ILLEGAL (terminal)');
    assert(!canTransitionPayment('expired', 'paid'), 'expired -> paid is ILLEGAL (terminal)');
    let threw = false;
    try {
      assertValidPaymentTransition('paid', 'created');
    } catch {
      threw = true;
    }
    assert(threw, 'assertValidPaymentTransition throws on illegal transition');
  } catch (err: any) {
    failed++;
    errors.push(`Transition test exception: ${err.message}`);
  }

  // 3. Reference Checksum Tests
  try {
    const ref = generateReference();
    assert(ref.length === 8, 'generateReference produces 8-char reference');
    const valid = validateReference(ref);
    assert(valid.isValid, `validateReference validates generated ref "${ref}"`);
    assert(!validateReference('DJC9S000').isValid, 'validateReference rejects look-alike 0');
    assert(normalizeReference(' k7-m4x2qh ') === 'K7M4X2QH', 'normalizeReference strips whitespace and hyphens');
  } catch (err: any) {
    failed++;
    errors.push(`Reference test exception: ${err.message}`);
  }

  // 4. Golden SMS Fixtures Parsing Tests
  for (const fixture of GOLDEN_SMS_FIXTURES) {
    try {
      const parsed = parseSmsWithAdapters(fixture.rawSms, fixture.sender, 1);
      assert(parsed.isValid, `Fixture ${fixture.provider} parsed successfully`);
      assert(parsed.provider === fixture.provider, `Fixture ${fixture.provider} provider matches`);
      assert(parsed.amountPaisa === fixture.expectedAmountPaisa, `Fixture ${fixture.provider} amount matches`);
      assert(parsed.trxId === fixture.expectedTrxId, `Fixture ${fixture.provider} trxId matches`);
      if (fixture.expectedRef) {
        assert(parsed.refNormalized === fixture.expectedRef, `Fixture ${fixture.provider} ref matches`);
      }
    } catch (err: any) {
      failed++;
      errors.push(`Fixture ${fixture.provider} exception: ${err.message}`);
    }
  }

  return { passed, failed, errors };
}

export async function runAsyncDomainTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
  const syncResults = runDomainTests();
  let passed = syncResults.passed;
  let failed = syncResults.failed;
  const errors = [...syncResults.errors];

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(`FAIL: ${testName}`);
    }
  }

  // 5. Device Signature Tests
  try {
    const { computeDeviceSignature, verifyDeviceIngestSignature } = await import('./device.ts');
    const secret = 'test_secret_123';
    const payload = {
      deviceId: 'dev_01',
      seqNo: 10,
      timestamp: Math.floor(Date.now() / 1000),
      rawSms: 'Tk 500 received. TrxID 9921',
    };
    const sig = await computeDeviceSignature(secret, payload);
    assert(sig.length === 64, 'computeDeviceSignature returns 64-char hex SHA-256');

    const validResult = await verifyDeviceIngestSignature(secret, 9, payload, sig);
    assert(validResult.isValid, 'verifyDeviceIngestSignature passes for valid signature & monotonic seq');

    const replayResult = await verifyDeviceIngestSignature(secret, 10, payload, sig);
    assert(!replayResult.isValid, 'verifyDeviceIngestSignature rejects duplicate seqNo (anti-replay)');
  } catch (err: any) {
    failed++;
    errors.push(`Device signature test exception: ${err.message}`);
  }

  // 6. Webhook Signature Tests
  try {
    const { signWebhookPayload, verifyWebhookSignature } = await import('./webhook.ts');
    const secret = 'whsec_demo_99';
    const body = JSON.stringify({ event: 'payment.paid', id: 'pay_01' });
    const signed = await signWebhookPayload(secret, body);
    assert(signed.signatureHeader.includes('v1='), 'Webhook signature header contains v1=');

    const validWh = await verifyWebhookSignature(signed.signatureHeader, body, secret);
    assert(validWh.isValid, 'verifyWebhookSignature succeeds for correct payload');

    const tamperedWh = await verifyWebhookSignature(signed.signatureHeader, 'tampered', secret);
    assert(!tamperedWh.isValid, 'verifyWebhookSignature rejects tampered body');
  } catch (err: any) {
    failed++;
    errors.push(`Webhook signature test exception: ${err.message}`);
  }

  return { passed, failed, errors };
}

