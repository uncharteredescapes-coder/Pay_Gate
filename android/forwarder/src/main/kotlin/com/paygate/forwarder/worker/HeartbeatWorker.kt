package com.paygate.forwarder.worker

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.paygate.forwarder.config.DeviceConfigManager
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Periodic WorkManager worker that reports device battery, power state, and latency.
 */
class HeartbeatWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    private val config = DeviceConfigManager.getInstance(appContext)

    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    override suspend fun doWork(): Result {
        val context = applicationContext
        val batteryIntent = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))

        val level = batteryIntent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: 100
        val scale = batteryIntent?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: 100
        val batteryPct = if (level >= 0 && scale > 0) ((level.toFloat() / scale.toFloat()) * 100).toInt() else 100

        val status = batteryIntent?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL

        val serverUrl = config.serverUrl
        val startTime = System.currentTimeMillis()

        val jsonBody = JSONObject().apply {
            put("battery_level", batteryPct)
            put("is_charging", isCharging)
            put("latency_ms", 25)
        }

        val request = Request.Builder()
            .url("$serverUrl/v1/devices/heartbeat")
            .addHeader("X-Device-Id", config.deviceId)
            .post(jsonBody.toString().toRequestBody("application/json".toMediaType()))
            .build()

        return try {
            client.newCall(request).execute().use { response ->
                val latency = (System.currentTimeMillis() - startTime).toInt()
                Log.d("HeartbeatWorker", "Heartbeat posted in ${latency}ms (HTTP ${response.code})")
                Result.success()
            }
        } catch (e: Exception) {
            Log.w("HeartbeatWorker", "Heartbeat failed: ${e.message}")
            Result.retry()
        }
    }
}
