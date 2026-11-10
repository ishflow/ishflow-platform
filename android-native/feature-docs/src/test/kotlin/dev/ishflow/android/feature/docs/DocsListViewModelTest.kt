package dev.ishflow.android.feature.docs

import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.DocumentListResponse
import dev.ishflow.android.appshared.models.DocumentRecord
import dev.ishflow.android.appshared.models.DocumentStatus
import dev.ishflow.android.appshared.models.PartyRef
import dev.ishflow.android.core.RefreshTrigger
import dev.ishflow.android.feature.docs.filter.DocsFilterState
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
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
import java.time.Instant
import java.time.LocalDate

@OptIn(ExperimentalCoroutinesApi::class)
class DocsListViewModelTest {
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
    fun `applyAdvancedFilter stores state and shrinks list to matching rows`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        val trigger = RefreshTrigger { 0L }

        val matching = docRecord(
            id = "match",
            date = Instant.parse("2026-05-05T10:00:00Z"),
            total = "1000.00",
            customer = PartyRef(id = "cust-1", name = "ACME"),
        )
        val outOfRange = docRecord(
            id = "out-amount",
            date = Instant.parse("2026-05-05T10:00:00Z"),
            total = "10.00",
            customer = PartyRef(id = "cust-1", name = "ACME"),
        )
        val wrongCustomer = docRecord(
            id = "out-customer",
            date = Instant.parse("2026-05-05T10:00:00Z"),
            total = "1000.00",
            customer = PartyRef(id = "cust-2", name = "OTHER"),
        )
        val outOfDate = docRecord(
            id = "out-date",
            date = Instant.parse("2026-04-01T10:00:00Z"),
            total = "1000.00",
            customer = PartyRef(id = "cust-1", name = "ACME"),
        )

        coEvery {
            api.listDocuments("sales.invoice", pageSize = 50)
        } returns response(matching, outOfRange, wrongCustomer, outOfDate)
        coEvery {
            api.listDocuments("purchases.invoice", pageSize = 50)
        } returns response()
        coEvery {
            api.listDocuments("sales.payment_received", pageSize = 50)
        } returns response()
        coEvery {
            api.listDocuments("purchases.payment_sent", pageSize = 50)
        } returns response()

        val vm = DocsListViewModel(api, trigger)
        assertNotNull(vm)
        advanceUntilIdle()

        val filter = DocsFilterState(
            dateFrom = LocalDate.parse("2026-05-01"),
            dateTo = LocalDate.parse("2026-05-31"),
            counterpartyId = "cust-1",
            counterpartyName = "ACME",
            amountMin = BigDecimal("500"),
            amountMax = BigDecimal("5000"),
        )

        vm.applyAdvancedFilter(filter)
        advanceUntilIdle()

        val stored = vm.advancedFilter.first()
        assertEquals(filter, stored)
        // date + counterparty + amount = 3 active buckets.
        assertEquals(3, stored.activeCount)

        val loaded = vm.uiState.first() as DocsListUiState.Loaded
        assertEquals(1, loaded.rows.size)
        assertEquals("match", loaded.rows.first().id)
    }

    @Test
    fun `clearAdvancedFilter resets to identity state`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        val trigger = RefreshTrigger { 0L }

        coEvery { api.listDocuments(any(), pageSize = 50) } returns response()

        val vm = DocsListViewModel(api, trigger)
        advanceUntilIdle()

        vm.applyAdvancedFilter(
            DocsFilterState(statuses = setOf(DocsFilterState.STATUS_POSTED)),
        )
        advanceUntilIdle()
        assertTrue(vm.advancedFilter.first().isActive)

        vm.clearAdvancedFilter()
        advanceUntilIdle()
        assertEquals(DocsFilterState(), vm.advancedFilter.first())
    }

    private fun docRecord(
        id: String,
        date: Instant,
        total: String?,
        customer: PartyRef? = null,
        supplier: PartyRef? = null,
        status: DocumentStatus = DocumentStatus.POSTED,
    ): DocumentRecord = DocumentRecord(
        id = id,
        number = id,
        date = date,
        status = status,
        createdAt = date,
        updatedAt = date,
        total = total,
        customer = customer,
        supplier = supplier,
    )

    private fun response(vararg items: DocumentRecord): DocumentListResponse =
        DocumentListResponse(
            items = items.toList(),
            total = items.size,
            page = 1,
            pageSize = 50,
        )
}
