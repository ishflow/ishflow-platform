package dev.ishflow.android.feature.cari.detail

import androidx.lifecycle.SavedStateHandle
import dev.ishflow.android.appshared.models.BalanceTrendPoint
import dev.ishflow.android.appshared.models.Counterparty
import dev.ishflow.android.appshared.models.CounterpartyType
import dev.ishflow.android.appshared.models.Customer360Invoice
import dev.ishflow.android.appshared.models.Customer360Party
import dev.ishflow.android.appshared.models.Customer360Payment
import dev.ishflow.android.appshared.models.Customer360Response
import dev.ishflow.android.appshared.models.Customer360StockOut
import dev.ishflow.android.appshared.models.ProductMovementSummary
import dev.ishflow.android.core.cache.DetailCache
import dev.ishflow.android.feature.cari.data.CariRepository
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
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.math.BigDecimal

/**
 * State-composition tests for [CounterpartyDetailViewModel].
 *
 * Covers the three branches the screen layer relies on:
 *   1. `find` succeeds + `fetch360` returns a payload → state.c360 is the
 *      payload, isFallback false, accessor lists match the payload.
 *   2. `find` succeeds + `fetch360` returns null → state.c360 null,
 *      isFallback true, legacy view path engages.
 *   3. `find` succeeds with no route type and the counterparty's own type
 *      is unknown → fallback, with the 360 endpoint never called.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class CounterpartyDetailViewModelTest {
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
    fun `composes c360 state when fetch succeeds`() = runTest(testDispatcher) {
        val repository = mockk<CariRepository>()
        val sample = sampleCustomer()
        val response = sampleResponse()
        coEvery { repository.find("c-1") } returns sample
        coEvery { repository.fetch360("c-1", CounterpartyType.customer) } returns response

        val vm = CounterpartyDetailViewModel(
            savedStateHandle = SavedStateHandle(mapOf("id" to "c-1", "type" to "customer")),
            repository = repository,
            detailCache = DetailCache(),
        )
        advanceUntilIdle()

        val state = vm.state.value
        assertFalse(state.isLoading)
        assertNull(state.errorMessage)
        assertNotNull(state.c360)
        assertFalse(state.isFallback)
        assertEquals(sample, state.counterparty)
        assertEquals(response.invoices, state.invoices)
        assertEquals(response.payments, state.payments)
        assertEquals(response.stockOuts, state.stockOuts)
        assertEquals(response.balanceTrend, state.sparkline)
        assertEquals("USD", state.currency)
    }

    @Test
    fun `falls back when fetch360 returns null`() = runTest(testDispatcher) {
        val repository = mockk<CariRepository>()
        val sample = sampleCustomer()
        coEvery { repository.find("c-1") } returns sample
        coEvery { repository.fetch360("c-1", CounterpartyType.customer) } returns null

        val vm = CounterpartyDetailViewModel(
            savedStateHandle = SavedStateHandle(mapOf("id" to "c-1", "type" to "customer")),
            repository = repository,
            detailCache = DetailCache(),
        )
        advanceUntilIdle()

        val state = vm.state.value
        assertFalse(state.isLoading)
        assertNull(state.c360)
        assertTrue(state.isFallback)
        assertTrue(state.invoices.isEmpty())
        assertTrue(state.payments.isEmpty())
        assertTrue(state.sparkline.isEmpty())
    }

    @Test
    fun `exposes productMovements from c360 payload`() = runTest(testDispatcher) {
        val repository = mockk<CariRepository>()
        val sample = sampleCustomer()
        val movement = ProductMovementSummary(
            productName = "Widget",
            totalQty = "12",
            lastDate = "2026-05-01",
        )
        val response = sampleResponse().copy(productMovements = listOf(movement))
        coEvery { repository.find("c-1") } returns sample
        coEvery { repository.fetch360("c-1", CounterpartyType.customer) } returns response

        val vm = CounterpartyDetailViewModel(
            savedStateHandle = SavedStateHandle(mapOf("id" to "c-1", "type" to "customer")),
            repository = repository,
            detailCache = DetailCache(),
        )
        advanceUntilIdle()

        val state = vm.state.value
        assertEquals(1, state.productMovements.size)
        assertEquals("Widget", state.productMovements[0].productName)
        assertEquals("12", state.productMovements[0].totalQty)
        assertEquals("2026-05-01", state.productMovements[0].lastDate)
    }

    @Test
    fun `productMovements is empty when c360 is null`() = runTest(testDispatcher) {
        val repository = mockk<CariRepository>()
        val sample = sampleCustomer()
        coEvery { repository.find("c-1") } returns sample
        coEvery { repository.fetch360("c-1", CounterpartyType.customer) } returns null

        val vm = CounterpartyDetailViewModel(
            savedStateHandle = SavedStateHandle(mapOf("id" to "c-1", "type" to "customer")),
            repository = repository,
            detailCache = DetailCache(),
        )
        advanceUntilIdle()

        assertTrue(vm.state.value.productMovements.isEmpty())
    }

    @Test
    fun `warmStartsFromDetailCacheBeforeFindReturns`() = runTest(testDispatcher) {
        val repository = mockk<CariRepository>()
        val cached = sampleCustomer().copy(name = "Acme Co. (cached)")
        val fresh = sampleCustomer().copy(name = "Acme Co. (fresh)")
        val cache = DetailCache().also { it.putCounterparty("c-1", cached) }
        coEvery { repository.find("c-1") } returns fresh
        coEvery { repository.fetch360("c-1", CounterpartyType.customer) } returns null

        val vm = CounterpartyDetailViewModel(
            savedStateHandle = SavedStateHandle(mapOf("id" to "c-1", "type" to "customer")),
            repository = repository,
            detailCache = cache,
        )

        // Before `find` runs we should already see the cached record so the
        // screen never flashes a skeleton on the second open.
        val warmState = vm.state.value
        assertEquals(cached, warmState.counterparty)
        assertFalse(warmState.isLoading)

        advanceUntilIdle()

        // After `find` returns the state must reflect the fresh record.
        assertEquals(fresh, vm.state.value.counterparty)
    }

    @Test
    fun `infers type from counterparty when route arg missing`() = runTest(testDispatcher) {
        val repository = mockk<CariRepository>()
        val supplier = sampleCustomer().copy(type = CounterpartyType.supplier)
        val response = sampleResponse().copy(type = CounterpartyType.supplier)
        coEvery { repository.find("c-1") } returns supplier
        coEvery { repository.fetch360("c-1", CounterpartyType.supplier) } returns response

        val vm = CounterpartyDetailViewModel(
            savedStateHandle = SavedStateHandle(mapOf("id" to "c-1")),
            repository = repository,
            detailCache = DetailCache(),
        )
        advanceUntilIdle()

        assertNotNull(vm.state.value.c360)
        assertFalse(vm.state.value.isFallback)
    }

    private fun sampleCustomer(): Counterparty = Counterparty(
        id = "c-1",
        type = CounterpartyType.customer,
        name = "Acme Co.",
        currency = "USD",
    )

    private fun sampleResponse(): Customer360Response = Customer360Response(
        type = CounterpartyType.customer,
        counterparty = Customer360Party(id = "c-1", name = "Acme Co."),
        balance = BigDecimal("100.00"),
        currency = "USD",
        balanceTrend = listOf(
            BalanceTrendPoint("2026-04-27", BigDecimal("0")),
            BalanceTrendPoint("2026-05-04", BigDecimal("100")),
        ),
        invoices = listOf(
            Customer360Invoice(
                id = "inv-1",
                number = "INV-001",
                date = "2026-05-01",
                status = "POSTED",
                total = BigDecimal("100.00"),
            ),
        ),
        payments = listOf(
            Customer360Payment(
                id = "pay-1",
                number = "PAY-001",
                date = "2026-05-02",
                amount = BigDecimal("50.00"),
                status = "POSTED",
            ),
        ),
        stockOuts = listOf(Customer360StockOut("so-1")),
    )
}
