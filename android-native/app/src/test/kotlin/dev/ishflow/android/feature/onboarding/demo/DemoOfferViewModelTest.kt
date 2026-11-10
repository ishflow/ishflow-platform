package dev.ishflow.android.feature.onboarding.demo

import androidx.lifecycle.SavedStateHandle
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.SeedDemoRequest
import dev.ishflow.android.appshared.models.SeedDemoResponse
import dev.ishflow.android.appshared.models.SeedDemoSummary
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
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

@OptIn(ExperimentalCoroutinesApi::class)
class DemoOfferViewModelTest {

    private val testDispatcher = StandardTestDispatcher()

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
    }

    @AfterEach
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun makeVm(api: ApiService = mockk(relaxed = true)) =
        DemoOfferViewModel(api, SavedStateHandle(mapOf("tenantId" to "t1")))

    @Test
    fun `seedSuccess transitions to Success state`() = runTest(testDispatcher) {
        val api = mockk<ApiService>(relaxed = true)
        coEvery { api.seedDemoData(any()) } returns SeedDemoResponse(
            ok = true,
            summary = SeedDemoSummary(customers = 5, products = 10, documents = 20),
        )
        val vm = makeVm(api)
        vm.seed()
        advanceUntilIdle()
        assertEquals(DemoOfferUiState.Success, vm.uiState.value)
    }

    @Test
    fun `seedFailure transitions to Error state`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        coEvery { api.seedDemoData(any()) } throws RuntimeException("boom")
        val vm = makeVm(api)
        vm.seed()
        advanceUntilIdle()
        assertTrue(vm.uiState.value is DemoOfferUiState.Error)
        assertEquals("boom", (vm.uiState.value as DemoOfferUiState.Error).message)
    }

    @Test
    fun `skipTransitionsToSkipped without calling API`() = runTest(testDispatcher) {
        val vm = makeVm()
        vm.skip()
        assertEquals(DemoOfferUiState.Skipped, vm.uiState.value)
    }
}
