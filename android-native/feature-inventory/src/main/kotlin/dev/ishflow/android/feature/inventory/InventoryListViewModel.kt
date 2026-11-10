package dev.ishflow.android.feature.inventory

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.api.ApiException
import dev.ishflow.android.appshared.api.toApiException
import dev.ishflow.android.appshared.models.RegisterBalanceRow
import dev.ishflow.android.core.RefreshTrigger
import dev.ishflow.android.feature.inventory.filter.FilterOption
import dev.ishflow.android.feature.inventory.filter.InventoryFilterState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.math.BigDecimal
import javax.inject.Inject

/**
 * Threshold (in register units) under which a row is considered "low stock"
 * for the chip-driven quick filter. Matches the iOS reference behaviour —
 * non-positive quantity counts as low.
 */
private val LOW_STOCK_THRESHOLD: BigDecimal = BigDecimal("5")

/**
 * Logical key the inventory list uses to identify a warehouse. Since the
 * register payload only carries warehouse *names* (the resolved label or
 * the UUID groupKey), we treat the name itself as the stable id. As soon
 * as the API surfaces a separate `warehouseId` dimension the model can
 * pick that up without UI changes.
 */
data class InventoryItem(
    val productId: String,
    val productName: String,
    val warehouse: String,
    val quantity: BigDecimal,
) {
    val warehouseKey: String get() = warehouse
}

sealed class InventoryListUiState {
    data object Loading : InventoryListUiState()
    data class Loaded(val items: List<InventoryItem>, val query: String) : InventoryListUiState()
    data class Failed(val exception: ApiException) : InventoryListUiState()
}

@HiltViewModel
class InventoryListViewModel @Inject constructor(
    private val api: ApiService,
    private val refreshTrigger: RefreshTrigger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<InventoryListUiState>(InventoryListUiState.Loading)
    val uiState: StateFlow<InventoryListUiState> = _uiState

    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing

    private val _filter = MutableStateFlow(InventoryFilterState())
    val filter: StateFlow<InventoryFilterState> = _filter.asStateFlow()

    /**
     * Last raw fetch result — kept private so [refresh] can re-apply the
     * client-side filter without re-hitting the network when only the
     * filter changes.
     */
    private var rawItems: List<InventoryItem> = emptyList()

    init {
        viewModelScope.launch {
            refreshTrigger.events.collect { refresh() }
        }
        refresh()
    }

    @Suppress("TooGenericExceptionCaught", "InstanceOfCheckForException")
    fun refresh() {
        viewModelScope.launch {
            _refreshing.value = true
            if (_uiState.value !is InventoryListUiState.Loaded) {
                _uiState.value = InventoryListUiState.Loading
            }
            try {
                rawItems = fetchItems()
                _uiState.value = InventoryListUiState.Loaded(
                    items = applyFiltersAndQuery(rawItems, query = ""),
                    query = "",
                )
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                if (_uiState.value !is InventoryListUiState.Loaded) {
                    _uiState.value = InventoryListUiState.Failed(e.toApiException())
                }
            } finally {
                _refreshing.value = false
            }
        }
    }

    @Suppress("TooGenericExceptionCaught", "InstanceOfCheckForException")
    fun search(query: String) {
        viewModelScope.launch {
            val current = _uiState.value
            if (current is InventoryListUiState.Loaded) {
                _uiState.value = current.copy(query = query)
            }
            try {
                if (rawItems.isEmpty()) {
                    rawItems = fetchItems()
                }
                _uiState.value = InventoryListUiState.Loaded(
                    items = applyFiltersAndQuery(rawItems, query),
                    query = query,
                )
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                _uiState.value = InventoryListUiState.Failed(e.toApiException())
            }
        }
    }

    /**
     * Commits a new filter snapshot and re-renders the list. Uses the
     * cached [rawItems] (set on the last successful fetch) so the filter
     * sheet does not have to wait for the network.
     */
    fun applyFilter(state: InventoryFilterState) {
        _filter.value = state
        emitFiltered()
    }

    /**
     * Quick-action toggle for the standalone "low stock" chip in the
     * scroll row — flips just that flag without touching the multi-select
     * dimensions.
     */
    fun toggleLowStockOnly() {
        _filter.update { it.copy(lowStockOnly = !it.lowStockOnly) }
        emitFiltered()
    }

    fun clearFilter() {
        _filter.value = InventoryFilterState()
        emitFiltered()
    }

    /**
     * Distinct warehouses pulled from the latest fetch. Used to populate
     * the warehouse picker in [InventoryFilterSheet]. Empty until the
     * first fetch lands.
     */
    val warehouseOptions: List<FilterOption>
        get() = rawItems
            .map { it.warehouse }
            .distinct()
            .sorted()
            .map { FilterOption(id = it, label = it) }

    /**
     * Category options come from the server in the future; the inventory
     * register currently does not expose this dimension so the list is
     * empty. The chip remains visible for iOS parity — the sheet renders
     * an empty-state hint inside the picker.
     */
    val categoryOptions: List<FilterOption> get() = emptyList()

    /** See [categoryOptions] — same story for product groups. */
    val groupOptions: List<FilterOption> get() = emptyList()

    private fun emitFiltered() {
        val current = _uiState.value
        val query = (current as? InventoryListUiState.Loaded)?.query.orEmpty()
        if (current is InventoryListUiState.Loaded) {
            _uiState.value = current.copy(items = applyFiltersAndQuery(rawItems, query))
        }
    }

    private fun applyFiltersAndQuery(items: List<InventoryItem>, query: String): List<InventoryItem> {
        val filter = _filter.value
        return items.asSequence()
            .filter { item -> matchesQuery(item, query) }
            .filter { item -> matchesFilter(item, filter) }
            .toList()
    }

    private fun matchesQuery(item: InventoryItem, query: String): Boolean =
        query.isEmpty() ||
            item.productName.contains(query, ignoreCase = true) ||
            item.warehouse.contains(query, ignoreCase = true)

    private fun matchesFilter(item: InventoryItem, filter: InventoryFilterState): Boolean {
        if (filter.warehouseIds.isNotEmpty() && item.warehouseKey !in filter.warehouseIds) {
            return false
        }
        if (filter.lowStockOnly && item.quantity > LOW_STOCK_THRESHOLD) {
            return false
        }
        // Category + group filters are intentional no-ops until the server
        // emits those dimensions on the register payload. The sheet shows
        // an empty-state hint inside those pickers so the user knows the
        // selection won't take effect yet.
        return true
    }

    /**
     * Calls the register-balance endpoint with `groupBy=product,warehouse`
     * so the server emits one row per (product, warehouse) pair carrying
     * resolved labels — the non-grouped call returns a single aggregated
     * row across the entire register (suitable for dashboard KPIs, useless
     * for a list).
     */
    private suspend fun fetchItems(): List<InventoryItem> {
        val response = api.registerBalance(
            slug = "inventory.stock",
            groupBy = "product,warehouse",
        )
        return response.rows.mapNotNull { row ->
            val productId = row.groupKey["product"].orEmpty()
            val productName = displayName(row, "product")
            val warehouseName = displayName(row, "warehouse")
            val quantity = row.quantity
            if (productId.isNotEmpty() && productName.isNotEmpty() && warehouseName.isNotEmpty() && quantity != null) {
                InventoryItem(
                    productId = productId,
                    productName = productName,
                    warehouse = warehouseName,
                    quantity = quantity,
                )
            } else {
                null
            }
        }
    }

    /**
     * Prefer the resolved label (human-readable name) over the raw UUID in
     * `groupKey`. Falls back to the UUID so a stale label cache can't make
     * a row vanish.
     */
    private fun displayName(row: RegisterBalanceRow, dim: String): String =
        row.groupLabels?.get(dim)?.takeIf { it.isNotBlank() }
            ?: row.groupKey[dim].orEmpty()
}
