package dev.ishflow.android.feature.prices

import dev.ishflow.android.appshared.models.CatalogRecord
import dev.ishflow.android.core.RefreshTrigger
import dev.ishflow.android.core.repository.CatalogRepository
import io.mockk.coJustRun
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flowOf
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
class PricesListViewModelTest {
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
    fun `observes cache then refreshes`() = runTest(testDispatcher) {
        val repo = mockk<CatalogRepository>()
        every { repo.observe("prices.priceList") } returns flowOf(
            listOf(CatalogRecord("p1", name = "Wholesale", createdAt = Instant.EPOCH, updatedAt = Instant.EPOCH)),
        )
        coJustRun { repo.refresh("prices.priceList") }

        val trigger = RefreshTrigger { 0L }
        val vm = PricesListViewModel(repo, trigger)
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is PricesListUiState.Loaded)
        assertEquals(1, (state as PricesListUiState.Loaded).records.size)
        coVerify(exactly = 1) { repo.refresh("prices.priceList") }
    }

    @Test
    fun `triggers reload on RefreshTrigger emit`() = runTest(testDispatcher) {
        val repo = mockk<CatalogRepository>()
        every { repo.observe("prices.priceList") } returns flowOf(emptyList())
        coJustRun { repo.refresh("prices.priceList") }

        val trigger = RefreshTrigger { 0L }
        val vm = PricesListViewModel(repo, trigger)
        advanceUntilIdle()
        coVerify(exactly = 1) { repo.refresh("prices.priceList") }
        trigger.fire(0)
        advanceUntilIdle()
        coVerify(exactly = 2) { repo.refresh("prices.priceList") }
    }
}
