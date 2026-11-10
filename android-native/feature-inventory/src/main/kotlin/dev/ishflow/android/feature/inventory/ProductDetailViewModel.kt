package dev.ishflow.android.feature.inventory

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.RegisterBalanceRow
import dev.ishflow.android.appshared.models.StockMovement
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.math.BigDecimal
import javax.inject.Inject

sealed interface ProductDetailUiState {
    data object Loading : ProductDetailUiState
    data class Failed(val exception: Throwable) : ProductDetailUiState
    data class Loaded(
        val productName: String,
        val balances: List<RegisterBalanceRow>,
        val totalQty: String,
        val movements: List<StockMovement>,
    ) : ProductDetailUiState
}

@HiltViewModel
class ProductDetailViewModel @Inject constructor(
    private val api: ApiService,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {

    private val productId: String = checkNotNull(savedStateHandle["productId"]) {
        "productId is required in SavedStateHandle"
    }
    private val initialProductName: String? = savedStateHandle["productName"]

    private val _uiState = MutableStateFlow<ProductDetailUiState>(ProductDetailUiState.Loading)
    val uiState: StateFlow<ProductDetailUiState> = _uiState

    init {
        load()
    }

    fun retry() = load()

    @Suppress("TooGenericExceptionCaught", "InstanceOfCheckForException")
    private fun load() {
        _uiState.value = ProductDetailUiState.Loading
        viewModelScope.launch {
            runCatching {
                coroutineScope {
                    val balancesDeferred = async {
                        api.getStockBalancesByProduct(product = productId)
                    }
                    val movementsDeferred = async {
                        api.getStockMovements(productId = productId, warehouseId = null)
                    }
                    balancesDeferred.await() to movementsDeferred.await()
                }
            }.onSuccess { (balanceResponse, movementsResponse) ->
                val balances = balanceResponse.rows
                val totalQty = balances
                    .mapNotNull { it.quantity }
                    .fold(BigDecimal.ZERO) { acc, qty -> acc + qty }
                    .toPlainString()
                _uiState.value = ProductDetailUiState.Loaded(
                    productName = initialProductName
                        ?: balances.firstOrNull()?.groupLabels?.get("product")
                        ?: "—",
                    balances = balances,
                    totalQty = totalQty,
                    movements = movementsResponse.movements,
                )
            }.onFailure { error ->
                if (error is kotlinx.coroutines.CancellationException) throw error
                _uiState.value = ProductDetailUiState.Failed(error)
            }
        }
    }
}
