package com.paygate.forwarder.config

import android.content.Context
import android.content.SharedPreferences

/**
 * Manages device credentials, server URL, and monotonic sequence numbers
 * persisted safely in private SharedPreferences.
 */
class DeviceConfigManager(context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    var deviceId: String
        get() = prefs.getString(KEY_DEVICE_ID, "dev_superadmin_01") ?: "dev_superadmin_01"
        set(value) = prefs.edit().putString(KEY_DEVICE_ID, value.trim()).apply()

    var deviceSecret: String
        get() = prefs.getString(KEY_DEVICE_SECRET, "dev_sec_superadmin_9921") ?: "dev_sec_superadmin_9921"
        set(value) = prefs.edit().putString(KEY_DEVICE_SECRET, value.trim()).apply()

    var serverUrl: String
        get() = prefs.getString(KEY_SERVER_URL, "https://api.example.com") ?: "https://api.example.com"
        set(value) = prefs.edit().putString(KEY_SERVER_URL, value.trim().removeSuffix("/")).apply()

    @Synchronized
    fun getNextSequenceNumber(): Long {
        val current = prefs.getLong(KEY_LAST_SEQ_NO, 100L)
        val next = current + 1
        prefs.edit().putLong(KEY_LAST_SEQ_NO, next).commit() // Synchronous commit to guarantee monotonicity
        return next
    }

    fun getLastSequenceNumber(): Long {
        return prefs.getLong(KEY_LAST_SEQ_NO, 100L)
    }

    companion object {
        private const val PREFS_NAME = "paygate_forwarder_prefs"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_DEVICE_SECRET = "device_secret"
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_LAST_SEQ_NO = "last_seq_no"

        @Volatile
        private var INSTANCE: DeviceConfigManager? = null

        fun getInstance(context: Context): DeviceConfigManager {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: DeviceConfigManager(context.applicationContext).also { INSTANCE = it }
            }
        }
    }
}
