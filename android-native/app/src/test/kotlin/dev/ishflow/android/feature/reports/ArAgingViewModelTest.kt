package dev.ishflow.android.feature.reports

import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.ArAging
import dev.ishflow.android.appshared.models.ArAgingBucketLabel
import dev.ishflow.android.appshared.models.ArAgingBucketRow
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
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant

@OptIn(ExperimentalCoroutinesApi::class)
class ArAgingViewModelTest {

    private val testDispatcher = StandardTestDispatcher()

    private val fakeArAging = ArAging(
        asOf = Instant.EPOCH,
        buckets = listOf(
            ArAgingBucketRow(
                label = ArAgingBucketLabel.ZERO_TO_30,
                total = BigDecimal("1000.00"),
                count = 3,
            ),
        ),
        byCustomer = emptyList(),
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
        coEvery { api.arAging() } returns fakeArAging

        val vm = ArAgingViewModel(api)

        assertTrue(vm.uiState.value is ArAgingUiState.Loading)
    }

    @Test
    fun `transitions to Loaded on success`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        coEvery { api.arAging() } returns fakeArAging

        val vm = ArAgingViewModel(api)
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is ArAgingUiState.Loaded)
        assertEquals(fakeArAging, (state as ArAgingUiState.Loaded).data)
    }

    @Test
    fun `transitions to Failed on error`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        coEvery { api.arAging() } throws RuntimeException("network down")

        val vm = ArAgingViewModel(api)
        advanceUntilIdle()

        assertTrue(vm.uiState.value is ArAgingUiState.Failed)
    }

    @Test
    fun `refreshing resets to false after load completes`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        coEvery { api.arAging() } returns fakeArAging

        val vm = ArAgingViewModel(api)
        advanceUntilIdle()

        assertFalse(vm.refreshing.value)
    }

    @Test
    fun `refresh reloads data and stays Loaded when already Loaded`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        coEvery { api.arAging() } returns fakeArAging

        val vm = ArAgingViewModel(api)
        advanceUntilIdle()
        assertTrue(vm.uiState.value is ArAgingUiState.Loaded)

        val updatedArAging = fakeArAging.copy(byCustomer = emptyList())
        coEvery { api.arAging() } returns updatedArAging

        vm.refresh()
        advanceUntilIdle()

        // When already Loaded, a failed refresh does NOT clobber the loaded state.
        // A successful refresh updates it.
        assertTrue(vm.uiState.value is ArAgingUiState.Loaded)
    }
}
