package dev.ishflow.android.core.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "pending_mutations")
data class PendingMutationEntity(
    @PrimaryKey val id: String,
    val endpoint: String,
    val method: String,
    val body: String,
    val idempotencyKey: String,
    val attempts: Int = 0,
    val lastError: String? = null,
    val status: String = "pending",
    val createdAt: Long,
)
