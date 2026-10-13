package com.paygate.forwarder

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicLong

class ForwarderService : Service() {

    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    private val sequenceNumber = AtomicLong(System.currentTimeMillis())

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForegroundServiceNotification()

        val sender = intent?.getStringExtra("sender") ?: ""
        val rawSms = intent?.getStringExtra("raw_sms") ?: ""
        val simSlot = intent?.getIntExtra("sim_slot", 1) ?: 1

        if (rawSms.isNotEmpty()) {
            CoroutineScope(Dispatchers.IO).launch {
                sendSmsToIngestApi(sender, rawSms, simSlot)
            }
        }

        return START_NOT_STICKY
    }

    private fun sendSmsToIngestApi(sender: String, rawSms: String, simSlot: Int) {
        val deviceId = "dev_superadmin_01"
        val deviceSecret = "dev_sec_superadmin_9921"
        val seqNo = sequenceNumber.incrementAndGet()
        val timestamp = System.currentTimeMillis() / 1000

        val signature = DeviceSigner.signPayload(deviceSecret, deviceId, seqNo, timestamp, rawSms)

        val jsonBody = JSONObject().apply {
            put("sender", sender)
            put("raw_sms", rawSms)
            put("sim_slot", simSlot)
            put("client_msg_id", "droid_${System.currentTimeMillis()}_$seqNo")
        }

        val request = Request.Builder()
            .url("https://api.example.com/v1/sms/webhook")
            .addHeader("X-Device-Id", deviceId)
            .addHeader("X-Device-Seq", seqNo.toString())
            .addHeader("X-Device-Timestamp", timestamp.toString())
            .addHeader("X-Device-Signature", signature)
            .post(jsonBody.toString().toRequestBody("application/json".toMediaType()))
            .build()

        try {
            client.newCall(request).execute().use { response ->
                Log.i("ForwarderService", "SMS dispatched. HTTP ${response.code}")
            }
        } catch (e: Exception) {
            Log.e("ForwarderService", "Failed to dispatch SMS", e)
        }
    }

    private fun startForegroundServiceNotification() {
        val channelId = "paygate_forwarder_channel"
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "PayGate Ingest Service",
                NotificationManager.IMPORTANCE_LOW
            )
            notificationManager.createNotificationChannel(channel)
        }

        val notification = Notification.Builder(this, channelId)
            .setContentTitle("PayGate SMS Gateway")
            .setContentText("Monitoring MFS verification messages")
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .build()

        startForeground(101, notification)
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
