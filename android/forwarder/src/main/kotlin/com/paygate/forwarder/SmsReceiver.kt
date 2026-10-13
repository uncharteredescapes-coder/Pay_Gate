package com.paygate.forwarder

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Telephony
import android.telephony.SubscriptionManager
import android.util.Log
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.paygate.forwarder.config.DeviceConfigManager
import com.paygate.forwarder.data.ForwarderDatabase
import com.paygate.forwarder.data.PendingSmsEntity
import com.paygate.forwarder.worker.SmsDispatchWorker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * BroadcastReceiver for incoming SMS.
 * Extracts multi-part SMS bodies, resolves SIM slot accurately,
 * writes to durable Room DB queue, and kicks off WorkManager dispatch.
 */
class SmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isNullOrEmpty()) return

        val sender = messages[0].displayOriginatingAddress ?: ""
        val fullBody = messages.joinToString("") { it.displayMessageBody ?: "" }

        val simSlot = resolveSimSlot(context, intent)

        Log.i("PayGateSmsReceiver", "SMS received from $sender (SIM slot $simSlot): ${fullBody.take(40)}...")

        val config = DeviceConfigManager.getInstance(context)
        val seqNo = config.getNextSequenceNumber()
        val timestamp = System.currentTimeMillis() / 1000
        val clientMsgId = "droid_${System.currentTimeMillis()}_$seqNo"

        val entity = PendingSmsEntity(
            clientMsgId = clientMsgId,
            sender = sender,
            rawSms = fullBody,
            simSlot = simSlot,
            seqNo = seqNo,
            timestampUnix = timestamp
        )

        // Asynchronously persist to Room queue, then trigger WorkManager
        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val db = ForwarderDatabase.getInstance(context)
                db.pendingSmsDao().insert(entity)

                // Schedule immediate FIFO dispatch
                val constraints = Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()

                val workRequest = OneTimeWorkRequestBuilder<SmsDispatchWorker>()
                    .setConstraints(constraints)
                    .build()

                WorkManager.getInstance(context).enqueueUniqueWork(
                    "paygate_sms_dispatch",
                    ExistingWorkPolicy.KEEP,
                    workRequest
                )
            } catch (e: Exception) {
                Log.e("PayGateSmsReceiver", "Failed to queue incoming SMS: ${e.message}", e)
            } finally {
                pendingResult.finish()
            }
        }
    }

    private fun resolveSimSlot(context: Context, intent: Intent): Int {
        // Method 1: Check standard carrier subscription ID extra
        val subId = intent.getIntExtra("subscription", -1)
        if (subId != -1 && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
            try {
                val subManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
                val info = subManager?.getActiveSubscriptionInfo(subId)
                if (info != null) {
                    return info.simSlotIndex + 1 // Convert 0-indexed to 1-indexed
                }
            } catch (e: SecurityException) {
                // READ_PHONE_STATE not granted
            }
        }

        // Method 2: Check proprietary OEM extras across MediaTek / Qualcomm / Samsung
        val slotKeys = arrayOf("simId", "slot", "sim_slot", "slot_id", "simSlot", "phone")
        for (key in slotKeys) {
            if (intent.hasExtra(key)) {
                val valInt = intent.getIntExtra(key, -1)
                if (valInt in 0..1) return valInt + 1
                if (valInt in 1..2) return valInt
            }
        }

        return 1 // Default to SIM 1
    }
}
