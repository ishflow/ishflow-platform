package dev.ishflow.android.feature.inventory

import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.RegisterBalanceResponse
import dev.ishflow.android.appshared.models.RegisterBalanceRow
import dev.ishflow.android.core.RefreshTrigger
import dev.ishflow.android.feature.inventory.filter.InventoryFilterState
import io.mockk.coEvery
import io.mockk.coVerify
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
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.math.BigDecimal

@OptIn(ExperimentalCoroutinesApi::class)
class InventoryListViewModelTest {
    private val testDispatcher = StandardTestDispatcher()

    @BeforeEach
    fun setup() {
        Dispatchers.setMain(testDispatcher)
    }

    @AfterEach
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `triggers reload on RefreshTrigger emit`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        val trigger = RefreshTrigger { 0L }
        val emptyBalance = RegisterBalanceResponse(
            register = "inventory.stock",
            asOf = null,
            rows = emptyList(),
        )
        coEvery { api.registerBalance(slug = "inventory.stock", groupBy = "product,warehouse") } returns emptyBalance

        val vm = InventoryListViewModel(api, trigger)
        assertNotNull(vm)
        advanceUntilIdle()
        coVerify(exactly = 1) { api.registerBalance(slug = "inventory.stock", groupBy = "product,warehouse") }
        trigger.fire(0)
        advanceUntilIdle()
        coVerify(exactly = 2) { api.registerBalance(slug = "inventory.stock", groupBy = "product,warehouse") }
    }

    @Test
    fun `applies low stock filter to loaded items`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        val trigger = RefreshTrigger { 0L }
        val rows = listOf(
            row(product = "Apple", warehouse = "Main", quantity = "2"),
            row(product = "Pear", warehouse = "Main", quantity = "10"),
            row(product = "Plum", warehouse = "Aux", quantity = "5"),
        )
        coEvery { api.registerBalance(slug = "inventory.stock", groupBy = "product,warehouse") } returns
            RegisterBalanceResponse(register = "inventory.stock", asOf = null, rows = rows)

        val vm = InventoryListViewModel(api, trigger)
        advanceUntilIdle()

        vm.toggleLowStockOnly()
        advanceUntilIdle()

        assertTrue(vm.filter.value.lowStockOnly)
        val state = vm.uiState.value as InventoryListUiState.Loaded
        // Threshold is 5 — Apple (2) and Plum (5) both pass; Pear (10) is filtered out.
        assertEquals(2, state.items.size)
        assertTrue(state.items.all { it.quantity <= BigDecimal("5") })
    }

    @Test
    fun `applies warehouse filter via applyFilter`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        val trigger = RefreshTrigger { 0L }
        val rows = listOf(
            row(product = "Apple", warehouse = "Main", quantity = "3"),
            row(product = "Pear", warehouse = "Aux", quantity = "10"),
        )
        coEvery { api.registerBalance(slug = "inventory.stock", groupBy = "product,warehouse") } returns
            RegisterBalanceResponse(register = "inventory.stock", asOf = null, rows = rows)

        val vm = InventoryListViewModel(api, trigger)
        advanceUntilIdle()

        vm.applyFilter(InventoryFilterState(warehouseIds = setOf("Aux")))
        advanceUntilIdle()

        val state = vm.uiState.value as InventoryListUiState.Loaded
        assertEquals(1, state.items.size)
        assertEquals("Aux", state.items.single().warehouse)
        assertEquals(1, vm.filter.value.activeCount)
    }

    @Test
    fun `clearFilter resets state and shows all items`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        val trigger = RefreshTrigger { 0L }
        val rows = listOf(
            row(product = "Apple", warehouse = "Main", quantity = "3"),
            row(product = "Pear", warehouse = "Aux", quantity = "10"),
        )
        coEvery { api.registerBalance(slug = "inventory.stock", groupBy = "product,warehouse") } returns
            RegisterBalanceResponse(register = "inventory.stock", asOf = null, rows = rows)

        val vm = InventoryListViewModel(api, trigger)
        advanceUntilIdle()

        vm.applyFilter(InventoryFilterState(lowStockOnly = true, warehouseIds = setOf("Main")))
        advanceUntilIdle()
        vm.clearFilter()
        advanceUntilIdle()

        assertEquals(InventoryFilterState(), vm.filter.value)
        val state = vm.uiState.value as InventoryListUiState.Loaded
        assertEquals(2, state.items.size)
    }

    private fun row(product: String, warehouse: String, quantity: String) = RegisterBalanceRow(
        groupKey = mapOf("product" to product, "warehouse" to warehouse),
        groupLabels = mapOf("product" to product, "warehouse" to warehouse),
        quantity = BigDecimal(quantity),
    )
}
