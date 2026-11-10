package dev.ishflow.android.feature.onboarding.workspace

import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.CreateWorkspaceRequest
import dev.ishflow.android.appshared.models.CreateWorkspaceResponse
import io.mockk.coEvery
import io.mockk.mockk
import io.mockk.slot
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
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

@OptIn(ExperimentalCoroutinesApi::class)
class WorkspaceSetupViewModelTest {

    private val testDispatcher = StandardTestDispatcher()

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
    }

    @AfterEach
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `submitValidFormCreatesWorkspaceAndEmitsSuccess`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        val requestSlot = slot<CreateWorkspaceRequest>()
        coEvery { api.createWorkspace(capture(requestSlot)) } returns CreateWorkspaceResponse(
            tenantId = "t1",
            jwt = "jwt-token",
            trialEndsAt = "2026-06-13T00:00:00Z",
        )
        val vm = WorkspaceSetupViewModel(api)
        vm.setName("Demo Co")
        vm.setBaseCurrency("USD")
        vm.submit("ru")
        advanceUntilIdle()
        // The device/app locale must flow through to the new tenant (was hardcoded "en").
        assertEquals("ru", requestSlot.captured.locale)
        assertEquals(
            WorkspaceSetupUiState.Success(tenantName = "Demo Co", tenantId = "t1"),
            vm.uiState.value,
        )
    }

    @Test
    fun `emptyNameKeepsSubmitDisabled`() = runTest(testDispatcher) {
        val vm = WorkspaceSetupViewModel(mockk())
        assertFalse(vm.canSubmit.first())
    }

    @Test
    fun `apiErrorTransitionsToErrorState`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        coEvery { api.createWorkspace(any()) } throws RuntimeException("boom")
        val vm = WorkspaceSetupViewModel(api)
        vm.setName("X")
        vm.setBaseCurrency("USD")
        vm.submit("ru")
        advanceUntilIdle()
        assertTrue(vm.uiState.value is WorkspaceSetupUiState.Error)
    }
}
