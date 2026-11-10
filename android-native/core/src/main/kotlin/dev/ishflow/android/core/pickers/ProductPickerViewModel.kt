package dev.ishflow.android.core.pickers

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.CatalogRecord
import dev.ishflow.android.core.repository.CatalogRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.math.BigDecimal
import javax.inject.Inject

private const val PRODUCT_ENTITY_SLUG = "inventory.product"

sealed class ProductPickerUiState {
    data object Loading : ProductPickerUiState()
    data class Loaded(val products: List<CatalogRecord>, val query: String) : ProductPickerUiState()
    data class Failed(val message: String) : ProductPickerUiState()
}

@HiltViewModel
class ProductPickerViewModel @Inject constructor(
    private val repo: CatalogRepository,
    private val api: ApiService,
    private val recentProductsStore: RecentProductsStore,
) : ViewModel() {

    private val _uiState = MutableStateFlow<ProductPickerUiState>(ProductPickerUiState.Loading)
    val uiState: StateFlow<ProductPickerUiState> = _uiState

    private var allProducts: List<CatalogRecord> = emptyList()

    /**
     * Recently picked products surfaced when the search field is focused with
     * an empty query — fills the blank surface above the keyboard instead of
     * showing nothing. Resolved against the live catalog so renamed/deleted
     * products fall out automatically.
     */
    private val _allProductsFlow = MutableStateFlow<List<CatalogRecord>>(emptyList())
    val recentProducts: StateFlow<List<CatalogRecord>> =
        combine(recentProductsStore.ids, _allProductsFlow) { ids, all ->
            val byId = all.associateBy { it.id }
            ids.mapNotNull { byId[it] }
        }.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = emptyList(),
        )

    /**
     * When non-null, the picker only shows products that hold positive stock
     * at this warehouse. Driven by [setWarehouse] from the sales wizard so
     * the user can't pick a product the server will reject for missing
     * stock. Null = no warehouse filter (used by purchase wizard etc.).
     */
    private var warehouseId: String? = null

    /** product IDs with stock > 0 at [warehouseId]; null = filter not active. */
    private var stockedProductIds: Set<String>? = null

    /**
     * Total stock (summed across every warehouse) per product. Populated as a
     * side effect of [loadWarehouseStock] — the same batch call already
     * returns the per-warehouse breakdown so we just sum it. Used by the
     * inline search dropdown to show "295 шт." per row even when the user
     * hasn't picked a warehouse yet.
     */
    private val _totalStockByProduct = MutableStateFlow<Map<String, BigDecimal>>(emptyMap())
    val totalStockByProduct: StateFlow<Map<String, BigDecimal>> = _totalStockByProduct.asStateFlow()

    /**
     * Active price-type id (e.g. the customer's defaultPriceType) the dropdown
     * should resolve prices against. Null = fall back to product.salePrice.
     */
    private var priceTypeId: String? = null

    /**
     * Resolved unit price per product for the current [priceTypeId]. Populated
     * lazily — the dropdown only displays a handful of rows so we resolve
     * just those (see [resolvePricesFor]).
     */
    private val _priceByProduct = MutableStateFlow<Map<String, BigDecimal>>(emptyMap())
    val priceByProduct: StateFlow<Map<String, BigDecimal>> = _priceByProduct.asStateFlow()

    init {
        viewModelScope.launch {
            repo.observe(PRODUCT_ENTITY_SLUG).collect { records ->
                allProducts = records
                _allProductsFlow.value = records
                emitState()
                // Refetch warehouse-stock whenever the catalog changes — the
                // user could create a new product mid-session, or inventory
                // could shift after another posting in the background.
                if (warehouseId != null) loadWarehouseStock()
            }
        }
        refresh()
    }

    /**
     * Sets the warehouse filter. Idempotent — passing the same id is a no-op.
     * Pass null to clear the filter.
     */
    fun setWarehouse(id: String?) {
        if (warehouseId == id) return
        warehouseId = id
        stockedProductIds = null
        emitState()
        if (id != null) loadWarehouseStock() else loadAllStock()
    }

    /**
     * Sets the price-type the dropdown should resolve unit prices against.
     * Idempotent. Triggers an async resolve for the first few visible products.
     */
    fun setPriceType(id: String?) {
        if (priceTypeId == id) return
        priceTypeId = id
        _priceByProduct.value = emptyMap()
        resolvePricesFor(currentVisibleProducts().take(VISIBLE_DROPDOWN_PRODUCT_LIMIT))
    }

    fun refresh() {
        viewModelScope.launch {
            runCatching { repo.refresh(PRODUCT_ENTITY_SLUG) }
                .onFailure { /* keep cached state */ }
        }
    }

    fun search(query: String) {
        val currentState = _uiState.value
        if (currentState is ProductPickerUiState.Loaded) {
            _uiState.value = ProductPickerUiState.Loaded(
                products = filter(currentVisibleProducts(), query),
                query = query,
            )
        }
    }

    private fun loadWarehouseStock() {
        val activeWarehouse = warehouseId ?: return
        val ids = allProducts.map { it.id }
        if (ids.isEmpty()) {
            stockedProductIds = emptySet()
            emitState()
            return
        }
        viewModelScope.launch {
            runCatching { api.getStockBatch(ids.joinToString(",")) }
                .onSuccess { resp ->
                    publishTotals(resp)
                    // Server still reflects the warehouseId we asked about?
                    if (warehouseId != activeWarehouse) return@onSuccess
                    val stocked = resp.items.asSequence()
                        .filter { item ->
                            item.byWarehouse.any {
                                it.warehouseId == activeWarehouse &&
                                    (it.qty.toDoubleOrNull() ?: 0.0) > 0.0
                            }
                        }
                        .map { it.productId }
                        .toSet()
                    stockedProductIds = stocked
                    emitState()
                }
                .onFailure {
                    // If we can't load stock, fall back to showing everything —
                    // better than blocking the wizard. The server will still
                    // reject on submit with a helpful error message.
                    stockedProductIds = null
                    emitState()
                }
        }
    }

    /**
     * Loads total stock for every product without applying a warehouse filter.
     * Called when no warehouse is selected yet so the dropdown still has
     * something to show in the "295 шт." badge.
     */
    private fun loadAllStock() {
        val ids = allProducts.map { it.id }
        if (ids.isEmpty()) return
        viewModelScope.launch {
            runCatching { api.getStockBatch(ids.joinToString(",")) }
                .onSuccess { resp -> publishTotals(resp) }
        }
    }

    private fun publishTotals(resp: dev.ishflow.android.appshared.models.StockBatchResponse) {
        val totals = resp.items.associate { item ->
            val sum = item.byWarehouse
                .mapNotNull { it.qty.toBigDecimalOrNull() }
                .fold(BigDecimal.ZERO) { acc, q -> acc + q }
            item.productId to sum
        }
        _totalStockByProduct.value = totals
    }

    @Suppress("TooGenericExceptionCaught", "SwallowedException")
    private fun resolvePricesFor(products: List<CatalogRecord>) {
        val target = priceTypeId?.lowercase() ?: return
        if (products.isEmpty()) return
        viewModelScope.launch {
            products.forEach { product ->
                if (_priceByProduct.value.containsKey(product.id)) return@forEach
                try {
                    val response = api.getProductPrices(product.id)
                    val resolved = response.items
                        .firstOrNull { it.priceTypeId.lowercase() == target }
                        ?.value
                    if (resolved != null) {
                        _priceByProduct.update { it + (product.id to resolved) }
                    }
                } catch (e: CancellationException) {
                    throw e
                } catch (_: Exception) {
                    // Silently skip — dropdown will fall back to salePrice.
                }
            }
        }
    }

    /** Apply the warehouse-stock filter (if any) before search. */
    private fun currentVisibleProducts(): List<CatalogRecord> {
        val stocked = stockedProductIds ?: return allProducts
        // Prefer products with positive stock at the selected warehouse. But if
        // NONE are in stock there, fall back to the full catalog rather than an
        // empty picker — the dropdown's per-row stock badge still surfaces the 0,
        // and the server validates stock on submit. Without this, selecting a
        // warehouse with no stock leaves the user staring at an empty search with
        // no products and no way forward.
        val inStock = allProducts.filter { it.id in stocked }
        return inStock.ifEmpty { allProducts }
    }

    private fun emitState() {
        val query = (_uiState.value as? ProductPickerUiState.Loaded)?.query ?: ""
        val products = filter(currentVisibleProducts(), query)
        _uiState.value = ProductPickerUiState.Loaded(
            products = products,
            query = query,
        )
        // Kick off price resolution for whatever the dropdown is about to show.
        resolvePricesFor(products.take(VISIBLE_DROPDOWN_PRODUCT_LIMIT))
    }

    companion object {
        // Keep in lockstep with InlineProductSearch.MAX_VISIBLE_PRODUCTS — only
        // resolve prices for the rows the dropdown actually renders.
        private const val VISIBLE_DROPDOWN_PRODUCT_LIMIT = 6
    }

    private fun filter(records: List<CatalogRecord>, query: String): List<CatalogRecord> {
        if (query.isBlank()) return records
        val lower = query.lowercase()
        return records.filter {
            it.name.lowercase().contains(lower) ||
                it.code?.lowercase()?.contains(lower) == true
        }
    }
}
