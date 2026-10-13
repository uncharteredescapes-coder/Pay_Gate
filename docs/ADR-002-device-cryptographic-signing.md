# Architecture Decision Record (ADR 002)
## Device Cryptographic Signature & Ingest Authentication

### Status
Accepted

### Context
In prototype versions, the SMS forwarder handset was authenticated solely by caller-supplied IP strings matching a CIDR allowlist. Because mobile handsets connect via dynamic CGNAT cellular data connections (GP, Robi, Banglalink, Teletalk), IP addresses change constantly across cell towers, and headers like `X-Forwarded-For` can be spoofed by callers.

### Decision
Replace IP-only enforcement with **Hardware-backed Cryptographic Signatures with Monotonic Replay Protection**:
1. Handsets sign each forwarded SMS using HMAC-SHA256 (or hardware Ed25519 Keystore).
2. The signed canonical string is: `${deviceId}:${seqNo}:${timestamp}:${rawSms}`.
3. Every ingest request must submit headers:
   - `X-Device-Id`
   - `X-Device-Seq` (strictly increasing monotonic counter)
   - `X-Device-Timestamp` (verified within a 300-second drift window)
   - `X-Device-Signature`
4. Replay attacks are rejected immediately if `seqNo <= lastSeqNo` or signature mismatches.

### Consequences
- Handset authentication is resilient across network switches and mobile data roaming.
- Spoofed ingest requests are intercepted and quarantined with zero database state pollution.
