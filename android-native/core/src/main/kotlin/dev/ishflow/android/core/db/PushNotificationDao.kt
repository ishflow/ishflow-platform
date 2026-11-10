package dev.ishflow.android.core.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface PushNotificationDao {
    @Query("SELECT * FROM push_notification ORDER BY received_at DESC LIMIT 50")
    fun observe(): Flow<List<PushNotificationEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: PushNotificationEntity)

    @Query("UPDATE push_notification SET read_at = :now WHERE id = :id")
    suspend fun markRead(id: String, now: Long = System.currentTimeMillis())

    @Query("DELETE FROM push_notification")
    suspend fun clear()
}
