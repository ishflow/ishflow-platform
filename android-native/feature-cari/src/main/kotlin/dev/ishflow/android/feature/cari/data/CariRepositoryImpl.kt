package dev.ishflow.android.feature.cari.data

import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.Counterparty
import dev.ishflow.android.appshared.models.CounterpartyType
import dev.ishflow.android.appshared.models.Customer360Response
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Retrofit-backed implementation of [CariRepository]. Translates the screen-side
 * [CariRepository.Kind] enum into the `type` query parameter expected by
 * `/api/mobile/counterparties` (which requires `customer` or `supplier`). The
 * "All" filter fans out both calls in parallel and merges results, since the
 * server has no `type=all` mode. Every row is tagged with its origin type so
 * the row tap can route to the correct detail screen — the server response
 * itself omits this field.
 */
@Singleton
class CariRepositoryImpl @Inject constructor(
    private val apiService: ApiService,
) : CariRepository {

    override suspend fun list(kind: CariRepository.Kind): List<Counterparty> = when (kind) {
        CariRepository.Kind.All -> coroutineScope {
            val customers = async { fetchTyped(CounterpartyType.customer) }
            val suppliers = async { fetchTyped(CounterpartyType.supplier) }
            (customers.await() + suppliers.await()).sortedBy { it.name.lowercase() }
        }
        CariRepository.Kind.Customer -> fetchTyped(CounterpartyType.customer)
        CariRepository.Kind.Supplier -> fetchTyped(CounterpartyType.supplier)
    }

    override suspend fun find(id: String): Counterparty? = coroutineScope {
        val customers = async { fetchTyped(CounterpartyType.customer) }
        val suppliers = async { fetchTyped(CounterpartyType.supplier) }
        (customers.await() + suppliers.await()).firstOrNull { it.id == id }
    }

    private suspend fun fetchTyped(type: CounterpartyType): List<Counterparty> {
        val response = apiService.listCounterparties(type = type.name)
        return response.items.map { it.copy(type = type) }
    }

    @Suppress("TooGenericExceptionCaught", "InstanceOfCheckForException")
    override suspend fun fetch360(id: String, type: CounterpartyType): Customer360Response? {
        return try {
            apiService.getCounterparty360(id = id, type = type.name)
        } catch (e: Exception) {
            if (e is CancellationException) throw e
            null
        }
    }
}
