package dev.ishflow.android.feature.genericdoc

import androidx.lifecycle.SavedStateHandle
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.DocumentRecord
import dev.ishflow.android.appshared.models.DocumentStatus
import dev.ishflow.android.appshared.models.LinkedInvoiceRef
import dev.ishflow.android.appshared.models.PartyRef
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
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.time.Instant
import kotlin.test.assertEquals
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class GenericDocDetailViewModelTest {

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
    fun `loaded payment_received exposes linked invoices`() = runTest(testDispatcher) {
        val record = DocumentRecord(
            id = "pr-1",
            number = "PR-0001",
            date = Instant.parse("2026-05-01T10:00:00Z"),
            status = DocumentStatus.POSTED,
            createdAt = Instant.parse("2026-05-01T10:00:00Z"),
            updatedAt = Instant.parse("2026-05-01T10:00:00Z"),
            customer = PartyRef(id = "c1", name = "Acme"),
            supplier = null,
            total = "5000.00",
            items = emptyList(),
            linkedInvoices = listOf(
                LinkedInvoiceRef(
                    invoiceId = "inv-100",
                    invoiceNumber = "INV-100",
                    amount = "5000.00",
                ),
            ),
        )

        val api = mockk<ApiService>()
        coEvery { api.getDocument("sales.payment_received", "pr-1") } returns record

        val savedStateHandle = SavedStateHandle(
            mapOf("module" to "sales", "name" to "payment_received", "id" to "pr-1"),
        )
        val vm = GenericDocDetailViewModel(savedStateHandle, api)

        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is GenericDocDetailUiState.Loaded, "Expected Loaded, got $state")
        val loaded = state as GenericDocDetailUiState.Loaded
        assertEquals(1, loaded.document.linkedInvoices.size)
        assertEquals("INV-100", loaded.document.linkedInvoices.first().invoiceNumber)
        assertEquals("5000.00", loaded.document.linkedInvoices.first().amount)
    }

    @Test
    fun `missing type or id surfaces Failed state`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        val savedStateHandle = SavedStateHandle(emptyMap<String, String>())
        val vm = GenericDocDetailViewModel(savedStateHandle, api)

        advanceUntilIdle()

        assertTrue(vm.uiState.value is GenericDocDetailUiState.Failed)
    }
}
