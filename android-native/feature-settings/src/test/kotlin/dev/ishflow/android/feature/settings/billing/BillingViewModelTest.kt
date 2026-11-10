package dev.ishflow.android.feature.settings.billing

import app.cash.turbine.test
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.BillingPortalResponse
import dev.ishflow.android.appshared.models.BillingResponse
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
class BillingViewModelTest {

    private val testDispatcher = StandardTestDispatcher()

    private val fakeBilling = BillingResponse(
        plan = "starter",
        status = "active",
        trialEnd = null,
        featureFlags = emptyMap(),
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
    fun `loading then loaded state on success`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        coEvery { api.getBilling() } returns fakeBilling

        val vm = BillingViewModel(api)
        assertTrue(vm.uiState.value is BillingUiState.Loading)

        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is BillingUiState.Loaded)
        assertEquals("starter", (state as BillingUiState.Loaded).billing.plan)
    }

    @Test
    fun `loading then failed state on error`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        coEvery { api.getBilling() } throws RuntimeException("network error")

        val vm = BillingViewModel(api)
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is BillingUiState.Failed)
        assertEquals("network error", (state as BillingUiState.Failed).message)
    }

    @Test
    fun `refresh reloads billing data`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        coEvery { api.getBilling() } returns fakeBilling

        val vm = BillingViewModel(api)
        advanceUntilIdle()
        assertTrue(vm.uiState.value is BillingUiState.Loaded)

        val updatedBilling = fakeBilling.copy(plan = "pro")
        coEvery { api.getBilling() } returns updatedBilling

        vm.refresh()
        advanceUntilIdle()

        val state = vm.uiState.value as BillingUiState.Loaded
        assertEquals("pro", state.billing.plan)
    }

    @Test
    fun `openPortal emits OpenPortal event on success`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        coEvery { api.getBilling() } returns fakeBilling
        coEvery { api.createBillingPortalSession() } returns BillingPortalResponse(url = "https://billing.example.com/portal")

        val vm = BillingViewModel(api)
        advanceUntilIdle()

        vm.events.test {
            vm.openPortal()
            advanceUntilIdle()

            val event = awaitItem()
            assertTrue(event is BillingEvent.OpenPortal)
            assertEquals("https://billing.example.com/portal", (event as BillingEvent.OpenPortal).url)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `openPortal emits Error event on failure`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        coEvery { api.getBilling() } returns fakeBilling
        coEvery { api.createBillingPortalSession() } throws RuntimeException("portal error")

        val vm = BillingViewModel(api)
        advanceUntilIdle()

        vm.events.test {
            vm.openPortal()
            advanceUntilIdle()

            val event = awaitItem()
            assertTrue(event is BillingEvent.Error)
            assertEquals("portal error", (event as BillingEvent.Error).message)
            cancelAndIgnoreRemainingEvents()
        }
    }
}
