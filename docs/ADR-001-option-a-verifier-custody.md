# Architecture Decision Record (ADR 001)
## Custody and Regulatory Licensing Architecture

### Status
Accepted

### Context
Bangladesh Bank regulations under the Payment and Settlement Systems Act, 2024 and 2014 PSP/PSO guidelines require strict licensing, minimum capital of 50 Crore BDT, and statutory escrow accounts for any entity that holds, intermediates, or pools customer funds before disbursing them to merchants.

### Decision
PayGate operates strictly under **Option A: Verifier Model**.
1. Funds move directly from consumer handsets/apps to the merchant's own registered personal/merchant MFS account (bKash, Nagad, Rocket, Upay, Cellfin).
2. PayGate never takes custody of funds, never pools balances in intermediary escrow accounts, and never conducts automated multi-party merchant payouts without external banking settlement instructions.
3. PayGate acts exclusively as an algorithmic transaction verification layer and SaaS telemetry provider.

### Consequences
- Regulatory risk is minimized. PayGate does not require a Bangladesh Bank PSP license to operate.
- Merchants configure and connect their own SIM-registered receiving numbers and handset forwarders.
- All ledger accounting entries represent verified informational claims rather than custodial liabilities.
