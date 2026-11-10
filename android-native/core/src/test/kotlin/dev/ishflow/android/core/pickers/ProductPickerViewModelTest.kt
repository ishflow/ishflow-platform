package dev.ishflow.android.core.pickers

import dev.ishflow.android.appshared.models.CatalogRecord
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
class ProductPickerViewModelTest {
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
        every { repo.observe("inventory.product") } returns flowOf(
            listOf(CatalogRecord("p1", name = "Widget", createdAt = Instant.EPOCH, updatedAt = Instant.EPOCH)),
        )
        coJustRun { repo.refresh("inventory.product") }

        val vm = ProductPickerViewModel(repo)
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is ProductPickerUiState.Loaded)
        assertEquals(1, (state as ProductPickerUiState.Loaded).products.size)
        coVerify { repo.refresh("inventory.product") }
    }

    @Test
    fun `search filters products by name`() = runTest(testDispatcher) {
        val repo = mockk<CatalogRepository>()
        every { repo.observe("inventory.product") } returns flowOf(
            listOf(
                CatalogRecord(
                    "p1",
                    name = "Widget A",
                    code = "W001",
                    createdAt = Instant.EPOCH,
                    updatedAt = Instant.EPOCH,
                ),
                CatalogRecord(
                    "p2",
                    name = "Gadget B",
                    code = "G002",
                    createdAt = Instant.EPOCH,
                    updatedAt = Instant.EPOCH,
                ),
            ),
        )
        coJustRun { repo.refresh("inventory.product") }

        val vm = ProductPickerViewModel(repo)
        advanceUntilIdle()

        vm.search("widget")
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is ProductPickerUiState.Loaded)
        assertEquals(1, (state as ProductPickerUiState.Loaded).products.size)
        assertEquals("Widget A", (state as ProductPickerUiState.Loaded).products.first().name)
    }

    @Test
    fun `search filters products by code`() = runTest(testDispatcher) {
        val repo = mockk<CatalogRepository>()
        every { repo.observe("inventory.product") } returns flowOf(
            listOf(
                CatalogRecord(
                    "p1",
                    name = "Widget A",
                    code = "W001",
                    createdAt = Instant.EPOCH,
                    updatedAt = Instant.EPOCH,
                ),
                CatalogRecord(
                    "p2",
                    name = "Gadget B",
                    code = "G002",
                    createdAt = Instant.EPOCH,
                    updatedAt = Instant.EPOCH,
                ),
            ),
        )
        coJustRun { repo.refresh("inventory.product") }

        val vm = ProductPickerViewModel(repo)
        advanceUntilIdle()

        vm.search("G002")
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is ProductPickerUiState.Loaded)
        assertEquals(1, (state as ProductPickerUiState.Loaded).products.size)
        assertEquals("Gadget B", (state as ProductPickerUiState.Loaded).products.first().name)
    }

    @Test
    fun `empty search shows all products`() = runTest(testDispatcher) {
        val repo = mockk<CatalogRepository>()
        every { repo.observe("inventory.product") } returns flowOf(
            listOf(
                CatalogRecord("p1", name = "Widget A", createdAt = Instant.EPOCH, updatedAt = Instant.EPOCH),
                CatalogRecord("p2", name = "Gadget B", createdAt = Instant.EPOCH, updatedAt = Instant.EPOCH),
            ),
        )
        coJustRun { repo.refresh("inventory.product") }

        val vm = ProductPickerViewModel(repo)
        advanceUntilIdle()

        vm.search("widget")
        advanceUntilIdle()
        vm.search("")
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is ProductPickerUiState.Loaded)
        assertEquals(2, (state as ProductPickerUiState.Loaded).products.size)
    }
}
