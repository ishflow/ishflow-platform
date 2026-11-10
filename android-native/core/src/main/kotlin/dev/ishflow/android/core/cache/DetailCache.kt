package dev.ishflow.android.core.cache

import dev.ishflow.android.appshared.models.Counterparty
import dev.ishflow.android.appshared.models.DocumentRecord
import java.time.Duration
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Tiny in-memory TTL cache for detail screens.
 * Lets a second open of the same record render warm content immediately
 * while the network call refreshes in the background.
 */
@Singleton
class DetailCache @Inject constructor() {
    private val docs = ConcurrentHashMap<String, Stamped<DocumentRecord>>()
    private val counterparties = ConcurrentHashMap<String, Stamped<Counterparty>>()
    private val ttl: Duration = Duration.ofSeconds(30)

    fun getDocument(id: String): DocumentRecord? = docs[id]?.takeIf { it.fresh() }?.value
    fun putDocument(id: String, value: DocumentRecord) { docs[id] = Stamped(Instant.now(), value) }
    /**
     * Drops the cached document so the next [getDocument] returns null even
     * within the TTL. Used after a mutation (post / unpost / deleteAttachment)
     * to skip the warm-start path and avoid a stale flicker before the fresh
     * payload arrives.
     */
    fun invalidateDocument(id: String) { docs.remove(id) }

    fun getCounterparty(id: String): Counterparty? = counterparties[id]?.takeIf { it.fresh() }?.value
    fun putCounterparty(id: String, value: Counterparty) { counterparties[id] = Stamped(Instant.now(), value) }
    /** Drops the cached counterparty so the next [getCounterparty] returns null. */
    fun invalidateCounterparty(id: String) { counterparties.remove(id) }

    private fun <T> Stamped<T>.fresh(): Boolean = Duration.between(timestamp, Instant.now()) < ttl

    private data class Stamped<T>(val timestamp: Instant, val value: T)
}
