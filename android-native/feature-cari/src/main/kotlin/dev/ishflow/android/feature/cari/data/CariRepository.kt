package dev.ishflow.android.feature.cari.data

import dev.ishflow.android.appshared.models.Counterparty
import dev.ishflow.android.appshared.models.CounterpartyType
import dev.ishflow.android.appshared.models.Customer360Response

/**
 * Source of counterparty (cari) records.
 *
 * Wrapped behind an interface so this module compiles before the parallel agent
 * lands `ApiService.listCounterparties`. The real implementation will swap the
 * fake for an `ApiService`-backed one without touching call sites.
 */
interface CariRepository {

    /** Counterparty kind filter for [list]. */
    enum class Kind { All, Customer, Supplier }

    /** Returns counterparties filtered by [kind]. */
    suspend fun list(kind: Kind): List<Counterparty>

    /** Returns a single counterparty by id, or null if not found. */
    suspend fun find(id: String): Counterparty?

    /**
     * Fetches the aggregated 360 payload for [id] with kind [type]. Returns
     * null on any failure — caller is expected to render the legacy
     * single-page detail view as a fallback rather than surfacing the error.
     */
    suspend fun fetch360(id: String, type: CounterpartyType): Customer360Response?
}
