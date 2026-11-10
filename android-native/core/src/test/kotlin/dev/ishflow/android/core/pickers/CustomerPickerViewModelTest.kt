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
class CustomerPickerViewModelTest {
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
        every { repo.observe("sales.customer") } returns flowOf(
            listOf(CatalogRecord("c1", name = "Acme Corp", createdAt = Instant.EPOCH, updatedAt = Instant.EPOCH)),
        )
        coJustRun { repo.refresh("sales.customer") }

        val vm = CustomerPickerViewModel(repo)
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is CustomerPickerUiState.Loaded)
        assertEquals(1, (state as CustomerPickerUiState.Loaded).customers.size)
        coVerify { repo.refresh("sales.customer") }
    }

    @Test
    fun `search filters customers by name`() = runTest(testDispatcher) {
        val repo = mockk<CatalogRepository>()
        every { repo.observe("sales.customer") } returns flowOf(
            listOf(
                CatalogRecord(
                    "c1",
                    name = "Acme Corp",
                    code = "AC001",
                    createdAt = Instant.EPOCH,
                    updatedAt = Instant.EPOCH,
                ),
                CatalogRecord(
                    "c2",
                    name = "Globex Inc",
                    code = "GL002",
                    createdAt = Instant.EPOCH,
                    updatedAt = Instant.EPOCH,
                ),
            ),
        )
        coJustRun { repo.refresh("sales.customer") }

        val vm = CustomerPickerViewModel(repo)
        advanceUntilIdle()

        vm.search("acme")
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is CustomerPickerUiState.Loaded)
        assertEquals(1, (state as CustomerPickerUiState.Loaded).customers.size)
        assertEquals("Acme Corp", (state as CustomerPickerUiState.Loaded).customers.first().name)
    }

    @Test
    fun `search filters customers by code`() = runTest(testDispatcher) {
        val repo = mockk<CatalogRepository>()
        every { repo.observe("sales.customer") } returns flowOf(
            listOf(
                CatalogRecord(
                    "c1",
                    name = "Acme Corp",
                    code = "AC001",
                    createdAt = Instant.EPOCH,
                    updatedAt = Instant.EPOCH,
                ),
                CatalogRecord(
                    "c2",
                    name = "Globex Inc",
                    code = "GL002",
                    createdAt = Instant.EPOCH,
                    updatedAt = Instant.EPOCH,
                ),
            ),
        )
        coJustRun { repo.refresh("sales.customer") }

        val vm = CustomerPickerViewModel(repo)
        advanceUntilIdle()

        vm.search("GL002")
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is CustomerPickerUiState.Loaded)
        assertEquals(1, (state as CustomerPickerUiState.Loaded).customers.size)
        assertEquals("Globex Inc", (state as CustomerPickerUiState.Loaded).customers.first().name)
    }

    @Test
    fun `empty search shows all customers`() = runTest(testDispatcher) {
        val repo = mockk<CatalogRepository>()
        every { repo.observe("sales.customer") } returns flowOf(
            listOf(
                CatalogRecord("c1", name = "Acme Corp", createdAt = Instant.EPOCH, updatedAt = Instant.EPOCH),
                CatalogRecord("c2", name = "Globex Inc", createdAt = Instant.EPOCH, updatedAt = Instant.EPOCH),
            ),
        )
        coJustRun { repo.refresh("sales.customer") }

        val vm = CustomerPickerViewModel(repo)
        advanceUntilIdle()

        vm.search("acme")
        advanceUntilIdle()
        vm.search("")
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is CustomerPickerUiState.Loaded)
        assertEquals(2, (state as CustomerPickerUiState.Loaded).customers.size)
    }
}
