package dev.ishflow.android.core

import dev.ishflow.android.core.db.PendingMutationDao
import dev.ishflow.android.core.db.PendingMutationEntity
import kotlinx.coroutines.flow.Flow
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

interface MutationSender {
    suspend fun send(mutation: PendingMutationEntity)
}

@Singleton
class SyncQueue @Inject constructor(private val dao: PendingMutationDao, private val sender: MutationSender) {
    suspend fun enqueue(endpoint: String, method: String, body: String): String {
        val mutation = PendingMutationEntity(
            id = UUID.randomUUID().toString(),
            endpoint = endpoint,
            method = method,
            body = body,
            idempotencyKey = UUID.randomUUID().toString(),
            createdAt = System.currentTimeMillis(),
        )
        dao.insert(mutation)
        return mutation.idempotencyKey
    }

    @Suppress("TooGenericExceptionCaught")
    suspend fun processNext(maxAttempts: Int = DEFAULT_MAX_ATTEMPTS) {
        val mutation = dao.nextPending() ?: return
        try {
            sender.send(mutation)
            dao.delete(mutation.id)
        } catch (t: Throwable) {
            val attempts = mutation.attempts + 1
            dao.update(
                mutation.copy(
                    attempts = attempts,
                    lastError = t.message,
                    status = if (attempts >= maxAttempts) "failed" else "pending",
                ),
            )
        }
    }

    fun failedMutations(): Flow<List<PendingMutationEntity>> = dao.observeFailed()

    suspend fun retry(id: String) {
        val mutation = dao.getById(id) ?: return
        dao.update(
            mutation.copy(
                status = "pending",
                attempts = 0,
                lastError = null,
            ),
        )
    }

    private companion object {
        const val DEFAULT_MAX_ATTEMPTS = 5
    }
}
