package com.paygate.forwarder.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update

@Dao
interface PendingSmsDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(sms: PendingSmsEntity): Long

    @Query("SELECT * FROM pending_sms WHERE status = 'PENDING' ORDER BY id ASC LIMIT 1")
    suspend fun getNextPending(): PendingSmsEntity?

    @Query("SELECT * FROM pending_sms WHERE status = 'PENDING' ORDER BY id ASC")
    suspend fun getAllPending(): List<PendingSmsEntity>

    @Query("SELECT COUNT(*) FROM pending_sms WHERE status = 'PENDING'")
    suspend fun getPendingCount(): Int

    @Query("UPDATE pending_sms SET status = 'DELIVERED' WHERE id = :id")
    suspend fun markDelivered(id: Long)

    @Query("UPDATE pending_sms SET attempts = :attempts, lastError = :error, status = :status WHERE id = :id")
    suspend fun updateFailure(id: Long, attempts: Int, error: String, status: String)

    @Query("DELETE FROM pending_sms WHERE status = 'DELIVERED' AND createdAt < :olderThanTimestamp")
    suspend fun pruneOldDelivered(olderThanTimestamp: Long)
}
