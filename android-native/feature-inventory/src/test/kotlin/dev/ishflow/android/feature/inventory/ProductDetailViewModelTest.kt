package dev.ishflow.android.feature.inventory

import androidx.lifecycle.SavedStateHandle
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.RegisterBalanceResponse
import dev.ishflow.android.appshared.models.RegisterBalanceRow
import dev.ishflow.android.appshared.models.StockMovement
import dev.ishflow.android.appshared.models.StockMovementsResponse
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertInstanceOf
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.math.BigDecimal

@OptIn(ExperimentalCoroutinesApi::class)
class ProductDetailViewModelTest {
    private val testDispatcher = StandardTestDispatcher()

    @BeforeEach
    fun setup() {
        Dispatchers.setMain(testDispatcher)
    }

    @AfterEach
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private val productId = "11111111-1111-1111-1111-111111111111"

    private fun savedState(
        productId: String = this.productId,
        productName: String? = "Widget",
        warehouse: String? = null,
        quantity: String? = null,
    ) = SavedStateHandle(
        buildMap {
            put("productId", productId)
            if (productName != null) put("productName", productName)
            if (warehouse != null) put("warehouse", warehouse)
            if (quantity != null) put("quantity", quantity)
        },
    )

    @Test
    fun `loads balances and movements in parallel and computes totalQty`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        coEvery { api.getStockBalancesByProduct(product = productId) } returns RegisterBalanceResponse(
            register = "inventory.stock",
            asOf = null,
            rows = listOf(
                RegisterBalanceRow(
                    groupKey = mapOf("warehouse" to "wh1"),
                    groupLabels = mapOf("warehouse" to "Main"),
                    quantity = BigDecimal("10"),
                ),
                RegisterBalanceRow(
                    groupKey = mapOf("warehouse" to "wh2"),
                    groupLabels = mapOf("warehouse" to "Branch"),
                    quantity = BigDecimal("5"),
                ),
            ),
        )
        coEvery { api.getStockMovements(productId = productId, warehouseId = null) } returns
            StockMovementsResponse(
                movements = listOf(
                    StockMovement(
                        date = "2026-05-01T00:00:00.000Z",
                        docKind = "sales.invoice",
                        docId = "aaaa-0000",
                        docNumber = "SI-1",
                        qty = "3",
                        direction = "out",
                        warehouse = "Main",
                    ),
                ),
            )

        val vm = ProductDetailViewModel(api, savedState())
        // Initial state is Loading
        assertTrue(vm.uiState.value is ProductDetailUiState.Loading)

        advanceUntilIdle()

        val state = vm.uiState.value
        assertInstanceOf(ProductDetailUiState.Loaded::class.java, state)
        state as ProductDetailUiState.Loaded

        assertEquals(2, state.balances.size)
        assertEquals("15", state.totalQty)
        assertEquals(1, state.movements.size)
        assertEquals("SI-1", state.movements.first().docNumber)
        assertEquals("Widget", state.productName)
    }

    @Test
    fun `falls back to product name from balance rows when not in savedState`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        coEvery { api.getStockBalancesByProduct(product = productId) } returns RegisterBalanceResponse(
            register = "inventory.stock",
            asOf = null,
            rows = listOf(
                RegisterBalanceRow(
                    groupKey = mapOf("warehouse" to "wh1"),
                    groupLabels = mapOf("warehouse" to "Main"),
                    quantity = BigDecimal("7"),
                ),
            ),
        )
        coEvery { api.getStockMovements(productId = productId, warehouseId = null) } returns
            StockMovementsResponse(movements = emptyList())

        val vm = ProductDetailViewModel(api, savedState(productName = null))
        advanceUntilIdle()

        val state = vm.uiState.value as ProductDetailUiState.Loaded
        assertEquals("—", state.productName)
    }

    @Test
    fun `emits Failed when API throws`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        val error = RuntimeException("network failure")
        coEvery { api.getStockBalancesByProduct(product = productId) } throws error
        coEvery { api.getStockMovements(productId = productId, warehouseId = null) } throws error

        val vm = ProductDetailViewModel(api, savedState())
        advanceUntilIdle()

        assertInstanceOf(ProductDetailUiState.Failed::class.java, vm.uiState.value)
    }

    @Test
    fun `retry transitions Loading then Loaded`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        val error = RuntimeException("first call fails")
        val successBalance = RegisterBalanceResponse(
            register = "inventory.stock",
            asOf = null,
            rows = listOf(
                RegisterBalanceRow(
                    groupKey = mapOf("warehouse" to "wh1"),
                    groupLabels = mapOf("warehouse" to "Main"),
                    quantity = BigDecimal("3"),
                ),
            ),
        )

        // Balance throws on first call, succeeds on all subsequent calls.
        // Movements always succeeds — this ensures the parallel coroutineScope
        // deterministically fails (balance throws → sibling cancelled or succeeds
        // independently, doesn't matter — the outer runCatching catches the failure).
        var balanceCallCount = 0
        coEvery { api.getStockBalancesByProduct(product = productId) } coAnswers {
            if (balanceCallCount++ == 0) throw error else successBalance
        }
        coEvery { api.getStockMovements(productId = productId, warehouseId = null) } returns
            StockMovementsResponse(movements = emptyList())

        val vm = ProductDetailViewModel(api, savedState())
        advanceUntilIdle()
        assertInstanceOf(ProductDetailUiState.Failed::class.java, vm.uiState.value)

        vm.retry()
        advanceUntilIdle()
        assertInstanceOf(ProductDetailUiState.Loaded::class.java, vm.uiState.value)
    }
}
