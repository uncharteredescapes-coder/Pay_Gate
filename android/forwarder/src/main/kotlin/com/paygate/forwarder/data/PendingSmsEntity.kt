package com.paygate.forwarder.data

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room Entity representing an SMS queued locally on the handset
 * for reliable retry and delivery to the PayGate API.
 */
@Entity(tableName = "pending_sms")
data class PendingSmsEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val clientMsgId: String,
    val sender: String,
    val rawSms: String,
    val simSlot: Int,
    val seqNo: Long,
    val timestampUnix: Long,
    val attempts: Int = 0,
    val status: String = "PENDING", // PENDING, DELIVERED, FAILED
    val lastError: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)
