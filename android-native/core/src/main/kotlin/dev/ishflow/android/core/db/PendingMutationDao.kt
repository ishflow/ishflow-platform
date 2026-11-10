package dev.ishflow.android.core.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface PendingMutationDao {
    @Insert
    suspend fun insert(mutation: PendingMutationEntity)

    @Query("SELECT * FROM pending_mutations WHERE id = :id")
    suspend fun getById(id: String): PendingMutationEntity?

    @Query("SELECT * FROM pending_mutations WHERE status = 'pending' ORDER BY createdAt LIMIT 1")
    suspend fun nextPending(): PendingMutationEntity?

    @Query("SELECT * FROM pending_mutations WHERE status = 'failed' ORDER BY createdAt DESC")
    fun observeFailed(): Flow<List<PendingMutationEntity>>

    /**
     * Outbox view for [NotificationsCenterSheet]: mutations still queued and
     * waiting for connectivity (status = 'pending'), newest first.
     */
    @Query("SELECT * FROM pending_mutations WHERE status = 'pending' ORDER BY createdAt DESC")
    fun observePending(): Flow<List<PendingMutationEntity>>

    @Update
    suspend fun update(mutation: PendingMutationEntity)

    @Query("DELETE FROM pending_mutations WHERE id = :id")
    suspend fun delete(id: String)
}
