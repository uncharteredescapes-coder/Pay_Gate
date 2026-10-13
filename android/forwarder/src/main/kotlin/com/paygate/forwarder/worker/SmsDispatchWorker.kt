package com.paygate.forwarder.worker

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.paygate.forwarder.DeviceSigner
import com.paygate.forwarder.config.DeviceConfigManager
import com.paygate.forwarder.data.ForwarderDatabase
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * WorkManager CoroutineWorker for reliable FIFO SMS dispatch with exponential backoff.
 */
class SmsDispatchWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    private val db = ForwarderDatabase.getInstance(appContext)
    private val config = DeviceConfigManager.getInstance(appContext)

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    override suspend fun doWork(): Result {
        val dao = db.pendingSmsDao()

        // Process all pending items sequentially (strict FIFO)
        while (true) {
            val pending = dao.getNextPending() ?: break

            val deviceId = config.deviceId
            val deviceSecret = config.deviceSecret
            val serverUrl = config.serverUrl

            val signature = DeviceSigner.signPayload(
                secretKey = deviceSecret,
                deviceId = deviceId,
                seqNo = pending.seqNo,
                timestamp = pending.timestampUnix,
                rawSms = pending.rawSms
            )

            val jsonBody = JSONObject().apply {
                put("sender", pending.sender)
                put("raw_sms", pending.rawSms)
                put("sim_slot", pending.simSlot)
                put("client_msg_id", pending.clientMsgId)
            }

            val request = Request.Builder()
                .url("$serverUrl/v1/sms/webhook")
                .addHeader("X-Device-Id", deviceId)
                .addHeader("X-Device-Seq", pending.seqNo.toString())
                .addHeader("X-Device-Timestamp", pending.timestampUnix.toString())
                .addHeader("X-Device-Signature", signature)
                .post(jsonBody.toString().toRequestBody("application/json".toMediaType()))
                .build()

            try {
                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful || response.code == 200 || response.code == 422) {
                        // 200 (Success/Duplicate) or 422 (Unparseable recorded) are terminal for this message
                        dao.markDelivered(pending.id)
                        Log.i("SmsDispatchWorker", "Successfully dispatched SMS #${pending.id} (HTTP ${response.code})")
                    } else if (response.code in 400..499 && response.code != 408 && response.code != 429) {
                        // Client error (e.g. 403 Forbidden signature fail) - mark failed to avoid poison pill
                        dao.updateFailure(pending.id, pending.attempts + 1, "HTTP ${response.code}", "FAILED")
                        Log.e("SmsDispatchWorker", "Client error HTTP ${response.code} for SMS #${pending.id}")
                    } else {
                        // Server or network error - retry with backoff
                        val nextAttempts = pending.attempts + 1
                        dao.updateFailure(pending.id, nextAttempts, "HTTP ${response.code}", if (nextAttempts >= 10) "FAILED" else "PENDING")
                        return Result.retry()
                    }
                }
            } catch (e: Exception) {
                Log.w("SmsDispatchWorker", "Network failure dispatching SMS #${pending.id}: ${e.message}")
                val nextAttempts = pending.attempts + 1
                dao.updateFailure(pending.id, nextAttempts, e.message ?: "Network error", if (nextAttempts >= 10) "FAILED" else "PENDING")
                return Result.retry()
            }
        }

        // Clean up delivered logs older than 7 days
        val weekAgo = System.currentTimeMillis() - (7 * 24 * 60 * 60 * 1000L)
        dao.pruneOldDelivered(weekAgo)

        return Result.success()
    }
}
