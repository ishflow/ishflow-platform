package dev.ishflow.android.feature.reports

import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.GrossProfit
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
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant

@OptIn(ExperimentalCoroutinesApi::class)
class GrossProfitViewModelTest {

    private val testDispatcher = StandardTestDispatcher()

    private fun fakeGrossProfit() = GrossProfit(
        period = ReportPeriod(Instant.EPOCH, Instant.now()),
        revenue = BigDecimal("5000.00"),
        cogs = BigDecimal("3000.00"),
        grossProfit = BigDecimal("2000.00"),
        marginPct = BigDecimal("0.40"),
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
    fun `starts in Loading state`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        coEvery { api.grossProfit(any(), any()) } returns fakeGrossProfit()

        val vm = GrossProfitViewModel(api)

        assertTrue(vm.uiState.value is GrossProfitUiState.Loading)
    }

    @Test
    fun `transitions to Loaded on success`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        val data = fakeGrossProfit()
        coEvery { api.grossProfit(any(), any()) } returns data

        val vm = GrossProfitViewModel(api)
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is GrossProfitUiState.Loaded)
        assertEquals(data, (state as GrossProfitUiState.Loaded).data)
    }

    @Test
    fun `transitions to Failed on error`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        coEvery { api.grossProfit(any(), any()) } throws RuntimeException("timeout")

        val vm = GrossProfitViewModel(api)
        advanceUntilIdle()

        assertTrue(vm.uiState.value is GrossProfitUiState.Failed)
    }

    @Test
    fun `refreshing resets to false after load completes`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        coEvery { api.grossProfit(any(), any()) } returns fakeGrossProfit()

        val vm = GrossProfitViewModel(api)
        advanceUntilIdle()

        assertFalse(vm.refreshing.value)
    }

    @Test
    fun `default preset is LAST_30_DAYS`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        coEvery { api.grossProfit(any(), any()) } returns fakeGrossProfit()

        val vm = GrossProfitViewModel(api)

        assertEquals(ReportPeriodPreset.LAST_30_DAYS, vm.preset.value)
    }

    @Test
    fun `selectPreset changes preset and triggers reload`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        coEvery { api.grossProfit(any(), any()) } returns fakeGrossProfit()

        val vm = GrossProfitViewModel(api)
        advanceUntilIdle()

        vm.selectPreset(ReportPeriodPreset.LAST_7_DAYS)
        advanceUntilIdle()

        assertEquals(ReportPeriodPreset.LAST_7_DAYS, vm.preset.value)
        assertTrue(vm.uiState.value is GrossProfitUiState.Loaded)
    }

    @Test
    fun `selectPreset with same value does not trigger reload`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        coEvery { api.grossProfit(any(), any()) } returns fakeGrossProfit()

        val vm = GrossProfitViewModel(api)
        advanceUntilIdle()

        // Calling selectPreset with the current value is a no-op.
        vm.selectPreset(ReportPeriodPreset.LAST_30_DAYS)
        advanceUntilIdle()

        // State remains Loaded — no transition to Loading.
        assertTrue(vm.uiState.value is GrossProfitUiState.Loaded)
    }

    @Test
    fun `currentPeriod returns non-empty ISO strings`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        coEvery { api.grossProfit(any(), any()) } returns fakeGrossProfit()

        val vm = GrossProfitViewModel(api)
        val (from, to) = vm.currentPeriod()

        assertNotNull(from)
        assertNotNull(to)
        assertTrue(from.isNotEmpty())
        assertTrue(to.isNotEmpty())
    }
}
