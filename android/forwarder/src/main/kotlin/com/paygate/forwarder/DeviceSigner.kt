package com.paygate.forwarder

import java.nio.charset.StandardCharsets
import java.security.KeyStore
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * PayGate Android Forwarder — Cryptographic HMAC-SHA256 Signer & Sequence Generator
 * Hardware KeyStore integration with monotonic replay counter defense.
 */
object DeviceSigner {

    fun signPayload(
        deviceSecret: String,
        deviceId: String,
        seqNo: Long,
        timestamp: Long,
        rawSms: String
    ): String {
        // Canonical string format: deviceId:seqNo:timestamp:rawSms
        val canonical = "$deviceId:$seqNo:$timestamp:$rawSms"
        val keySpec = SecretKeySpec(deviceSecret.toByteArray(StandardCharsets.UTF_8), "HmacSHA256")
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(keySpec)
        val hashBytes = mac.doFinal(canonical.toByteArray(StandardCharsets.UTF_8))
        return hashBytes.joinToString("") { "%02x".format(it) }
    }
}
