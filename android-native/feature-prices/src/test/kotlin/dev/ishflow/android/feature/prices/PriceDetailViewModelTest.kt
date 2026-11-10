package dev.ishflow.android.feature.prices

import androidx.lifecycle.SavedStateHandle
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.CatalogRecord
import dev.ishflow.android.appshared.models.PaginatedResponse
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
import java.io.IOException
import java.time.Instant
import kotlin.test.assertEquals
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class PriceDetailViewModelTest {

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
    fun `retry after failure transitions to loaded`() = runTest(testDispatcher) {
        val priceRecord = CatalogRecord(
            id = "abc",
            name = "Test Price",
            createdAt = Instant.EPOCH,
            updatedAt = Instant.EPOCH,
        )
        val api = mockk<ApiService>()
        // First call throws, second call succeeds
        coEvery { api.listCatalog(any(), any(), any(), any()) } throws IOException("network error") andThen
            PaginatedResponse(items = listOf(priceRecord), total = 1, page = 1, pageSize = 20)

        val vm = PriceDetailViewModel(
            savedStateHandle = SavedStateHandle(mapOf("id" to "abc")),
            api = api,
        )

        // Initial load fails
        advanceUntilIdle()
        assertTrue(vm.uiState.value is PriceDetailUiState.Failed, "Expected Failed after initial error load")

        // Retry — should succeed
        vm.retry()
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is PriceDetailUiState.Loaded, "Expected Loaded after retry, got $state")
        assertEquals("Test Price", (state as PriceDetailUiState.Loaded).record.name)
    }
}
