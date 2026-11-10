package dev.ishflow.android.feature.reports

import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.SalesSummary
import dev.ishflow.android.appshared.models.ReportPeriod
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
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant

/**
 * Verifies the export-related helpers on [SalesSummaryViewModel]:
 * - [SalesSummaryViewModel.currentPeriod] returns non-empty ISO-8601 strings.
 * - Switching presets changes the period returned by [currentPeriod].
 * - The ViewModel transitions to [SalesSummaryUiState.Loaded] so the Screen
 *   can enable the share button immediately after data arrives.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class SalesSummaryExportTest {

    private val testDispatcher = StandardTestDispatcher()

    private fun emptySummary(from: Instant, to: Instant) = SalesSummary(
        period = ReportPeriod(from, to),
        totalRevenue = BigDecimal.ZERO,
        invoiceCount = 0,
        byCustomer = emptyList(),
        byProduct = emptyList(),
    )

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
    }

    @AfterEach
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `currentPeriod returns non-null ISO strings for default preset`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        coEvery { api.salesSummary(any(), any()) } returns emptySummary(Instant.EPOCH, Instant.now())

        val vm = SalesSummaryViewModel(api)
        val (from, to) = vm.currentPeriod()

        assertNotNull(from)
        assertNotNull(to)
        assertTrue(from.isNotEmpty(), "from must be non-empty ISO string")
        assertTrue(to.isNotEmpty(), "to must be non-empty ISO string")
    }

    @Test
    fun `currentPeriod returns different from after preset switch`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        coEvery { api.salesSummary(any(), any()) } returns emptySummary(Instant.EPOCH, Instant.now())

        val vm = SalesSummaryViewModel(api)
        val (from30, _) = vm.currentPeriod()

        vm.selectPreset(ReportPeriodPreset.LAST_7_DAYS)
        advanceUntilIdle()

        val (from7, _) = vm.currentPeriod()
        // 7-day window starts later than 30-day window
        assertTrue(
            Instant.parse(from7) > Instant.parse(from30),
            "7-day from ($from7) should be later than 30-day from ($from30)",
        )
    }

    @Test
    fun `ViewModel transitions to Loaded so share button can be enabled`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        coEvery { api.salesSummary(any(), any()) } returns emptySummary(Instant.EPOCH, Instant.now())

        val vm = SalesSummaryViewModel(api)
        advanceUntilIdle()

        assertEquals(SalesSummaryUiState.Loaded::class, vm.uiState.value::class)
    }
}
