# Operations Runbook: Incident Response & Fleet Troubleshooting

## 1. Handset Forwarder Goes Offline / Missed Heartbeats
- **Symptom**: Heartbeat latency exceeds 120,000ms; device marked `offline` in Admin Fleet console.
- **Immediate Action**:
  1. Inspect physical handset on Android device farm rack.
  2. Verify battery level > 20% and charging cable connection.
  3. Verify SIM signal bars and mobile data connection.
  4. Launch PayGate Forwarder app and tap "Force Test Ping".

## 2. Ingest Signature Mismatch / Replay Alerts
- **Symptom**: Sudden surge in `403 Forbidden` on `/v1/sms/webhook` logged to `quarantined_sms`.
- **Diagnosis**:
  1. Check device sequence clock desynchronization.
  2. Inspect if device app was reinstalled without rotating device secret in Admin console.
  3. If compromised, revoke device key immediately from Admin Ops tab and provision a new pair.

## 3. Unparseable SMS / Telco Copy Format Changes
- **Symptom**: Spikes in `422 Unparseable SMS` in `quarantined_sms`.
- **Diagnosis & Fix**:
  1. Query `quarantined_sms` for latest raw SMS bodies.
  2. Identify if bKash, Nagad, Rocket, Upay, or Cellfin changed their notification copy.
  3. Add the new SMS template to `packages/domain/src/providers/fixtures.ts`.
  4. Update the respective provider regex parser in `packages/domain/src/providers/<provider>.ts`.
  5. Run test suite: `npx tsx scripts/run-tests.ts`.
  6. Deploy updated domain package.
