package dev.ishflow.android.feature.settings.account

import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.auth.AuthFlow
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
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
class AccountDeletionViewModelTest {

    private val testDispatcher = StandardTestDispatcher()

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
    }

    @AfterEach
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun buildVm(api: ApiService = mockk(), authFlow: AuthFlow = mockk(relaxed = true)) =
        AccountDeletionViewModel(api, authFlow)

    @Test
    fun `initial state is Idle`() = runTest(testDispatcher) {
        val vm = buildVm()
        assertTrue(vm.uiState.value is AccountDeletionUiState.Idle)
    }

    @Test
    fun `startConfirmation transitions to ConfirmingDeletion`() = runTest(testDispatcher) {
        val vm = buildVm()
        vm.startConfirmation()
        assertTrue(vm.uiState.value is AccountDeletionUiState.ConfirmingDeletion)
    }

    @Test
    fun `cancel from ConfirmingDeletion returns to Idle`() = runTest(testDispatcher) {
        val vm = buildVm()
        vm.startConfirmation()
        assertTrue(vm.uiState.value is AccountDeletionUiState.ConfirmingDeletion)
        vm.cancel()
        assertTrue(vm.uiState.value is AccountDeletionUiState.Idle)
    }

    @Test
    fun `confirmDelete transitions Deleting then Deleted on success`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        val authFlow = mockk<AuthFlow>(relaxed = true)
        coEvery { api.deleteAccount() } returns Unit

        val vm = buildVm(api, authFlow)
        vm.confirmDelete()
        // Immediately after calling, it should be Deleting
        assertTrue(vm.uiState.value is AccountDeletionUiState.Deleting)

        advanceUntilIdle()

        assertTrue(vm.uiState.value is AccountDeletionUiState.Deleted)
        coVerify(exactly = 1) { authFlow.signOut() }
    }

    @Test
    fun `confirmDelete transitions to Error on generic failure`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        val authFlow = mockk<AuthFlow>(relaxed = true)
        coEvery { api.deleteAccount() } throws RuntimeException("server error")

        val vm = buildVm(api, authFlow)
        vm.confirmDelete()
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is AccountDeletionUiState.Error)
        val error = state as AccountDeletionUiState.Error
        assertEquals("server error", error.message)
        assertEquals(false, error.isSoleOwner)
        coVerify(exactly = 0) { authFlow.signOut() }
    }

    @Test
    fun `confirmDelete sets isSoleOwner true on HTTP 409`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        val authFlow = mockk<AuthFlow>(relaxed = true)

        // Simulate a Retrofit HTTP 409 using real retrofit2.HttpException.
        val body = """{"code":"sole_owner_workspaces"}"""
            .toResponseBody("application/json".toMediaType())
        val response = retrofit2.Response.error<Unit>(409, body)
        coEvery { api.deleteAccount() } throws retrofit2.HttpException(response)

        val vm = buildVm(api, authFlow)
        vm.confirmDelete()
        advanceUntilIdle()

        val state = vm.uiState.value as AccountDeletionUiState.Error
        assertTrue(state.isSoleOwner)
        coVerify(exactly = 0) { authFlow.signOut() }
    }
}
