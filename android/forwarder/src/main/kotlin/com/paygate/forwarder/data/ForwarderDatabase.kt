package com.paygate.forwarder.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(entities = [PendingSmsEntity::class], version = 1, exportSchema = false)
abstract class ForwarderDatabase : RoomDatabase() {

    abstract fun pendingSmsDao(): PendingSmsDao

    companion object {
        @Volatile
        private var INSTANCE: ForwarderDatabase? = null

        fun getInstance(context: Context): ForwarderDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    ForwarderDatabase::class.java,
                    "paygate_forwarder.db"
                ).fallbackToDestructiveMigration().build().also { INSTANCE = it }
            }
        }
    }
}
