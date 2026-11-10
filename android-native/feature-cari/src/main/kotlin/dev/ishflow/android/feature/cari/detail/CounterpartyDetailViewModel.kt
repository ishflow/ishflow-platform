package dev.ishflow.android.feature.cari.detail

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.appshared.models.BalanceTrendPoint
import dev.ishflow.android.appshared.models.Counterparty
import dev.ishflow.android.appshared.models.CounterpartyType
import dev.ishflow.android.appshared.models.Customer360Invoice
import dev.ishflow.android.appshared.models.Customer360Payment
import dev.ishflow.android.appshared.models.Customer360Response
import dev.ishflow.android.appshared.models.Customer360StockOut
import dev.ishflow.android.appshared.models.NoteEntry
import dev.ishflow.android.appshared.models.ProductMovementSummary
import dev.ishflow.android.appshared.models.DocumentRecord
import dev.ishflow.android.core.cache.DetailCache
import dev.ishflow.android.feature.cari.data.CariRepository
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import javax.inject.Inject

private const val SEARCH_DEBOUNCE_MS = 300L

/**
 * Detail-page state for a single counterparty.
 *
 * Two display modes:
 *
 * - `c360 != null` → render the 4-tab Customer 360 layout (Invoices,
 *   Payments, Stock-outs, Notes) with the balance sparkline header.
 * - `c360 == null` → fall back to the legacy single-page recent docs view.
 *   Reached either because the type was unknown, the 360 endpoint failed,
 *   or `isFallback` was set explicitly (network error path).
 *
 * Both modes share the underlying `counterparty` record so the header card
 * and balance pill behave identically regardless of which body renders.
 */
data class CounterpartyDetailState(
    val counterparty: Counterparty? = null,
    val searchQuery: String = "",
    val recentDocs: List<DocumentRecord> = emptyList(),
    val errorMessage: String? = null,
    val isLoading: Boolean = true,
    /** Aggregated 360 payload — null when fallback is active. */
    val c360: Customer360Response? = null,
    /** True when the 360 fetch failed; UI renders the legacy layout. */
    val isFallback: Boolean = false,
) {
    /** Convenience accessors so the screen layer doesn't drill into c360. */
    val invoices: List<Customer360Invoice> get() = c360?.invoices.orEmpty()
    val payments: List<Customer360Payment> get() = c360?.payments.orEmpty()
    val stockOuts: List<Customer360StockOut> get() = c360?.stockOuts.orEmpty()
    val productMovements: List<ProductMovementSummary> get() = c360?.productMovements.orEmpty()
    val notes: List<NoteEntry> get() = c360?.notes.orEmpty()
    val sparkline: List<BalanceTrendPoint> get() = c360?.balanceTrend.orEmpty()
    val currency: String? get() = c360?.currency ?: counterparty?.currency
}

/**
 * Loads a single counterparty by id and owns a debounced search query for the
 * documents-by-counterparty pane. After the base counterparty load succeeds,
 * fires the `/api/mobile/counterparty-360/{id}` fetch in the background.
 * Failure of the 360 call demotes the UI to the legacy single-page view
 * (`isFallback = true`) rather than surfacing the error — per the parity
 * spec the screen must always render something, never crash or show "no
 * data" because of a partial outage.
 */
@OptIn(FlowPreview::class)
@HiltViewModel
class CounterpartyDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repository: CariRepository,
    private val detailCache: DetailCache,
) : ViewModel() {

    private val _state = MutableStateFlow(CounterpartyDetailState())
    val state: StateFlow<CounterpartyDetailState> = _state

    private val _searchInput = MutableStateFlow("")

    init {
        val id: String? = savedStateHandle["id"]
        val rawType: String? = savedStateHandle["type"]
        val type: CounterpartyType? = parseType(rawType)
        if (id.isNullOrBlank()) {
            _state.value = CounterpartyDetailState(
                isLoading = false,
                errorMessage = MISSING_ID_KEY,
            )
        } else {
            // Warm-start: render cached base counterparty so the second open of
            // the same record shows real content immediately while `find`
            // refreshes in the background.
            val cached = detailCache.getCounterparty(id)
            if (cached != null) {
                _state.value = _state.value.copy(
                    counterparty = cached,
                    isLoading = false,
                )
            }
            load(id, type)
        }
        observeSearchInput()
    }

    fun onSearchQueryChanged(query: String) {
        _searchInput.value = query
    }

    @Suppress("TooGenericExceptionCaught", "InstanceOfCheckForException")
    private fun load(id: String, type: CounterpartyType?) {
        viewModelScope.launch {
            try {
                val counterparty = repository.find(id)
                if (counterparty != null) {
                    detailCache.putCounterparty(id, counterparty)
                }
                _state.value = _state.value.copy(
                    counterparty = counterparty,
                    isLoading = false,
                    errorMessage = if (counterparty == null) NOT_FOUND_KEY else null,
                )
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                _state.value = _state.value.copy(
                    isLoading = false,
                    errorMessage = e.message ?: GENERIC_ERROR_KEY,
                )
                return@launch
            }
            // Resolve the counterparty kind: prefer the route argument, fall
            // back to whatever the repo returned. Without a kind we can't
            // call the 360 endpoint, so we stay on the legacy view.
            val resolvedType = type ?: _state.value.counterparty?.type
            if (resolvedType == null) {
                _state.value = _state.value.copy(isFallback = true)
                return@launch
            }
            val c360 = repository.fetch360(id, resolvedType)
            if (c360 != null) {
                _state.value = _state.value.copy(c360 = c360, isFallback = false)
            } else {
                _state.value = _state.value.copy(isFallback = true)
            }
        }
    }

    private fun observeSearchInput() {
        _searchInput
            .drop(1)
            .debounce(SEARCH_DEBOUNCE_MS)
            .onEach { query ->
                _state.value = _state.value.copy(searchQuery = query)
                // recentDocs fetch deferred — see KNOWN_LIMITATIONS.
            }
            .launchIn(viewModelScope)
    }

    private fun parseType(raw: String?): CounterpartyType? = when (raw) {
        CounterpartyType.customer.name -> CounterpartyType.customer
        CounterpartyType.supplier.name -> CounterpartyType.supplier
        else -> null
    }

    private companion object {
        const val MISSING_ID_KEY = "missing-id"
        const val NOT_FOUND_KEY = "not-found"
        const val GENERIC_ERROR_KEY = "error"
    }
}
