package dev.ishflow.android.feature.sales

import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.DocumentListResponse
import dev.ishflow.android.appshared.models.DocumentRecord
import dev.ishflow.android.appshared.models.DocumentStatus
import dev.ishflow.android.core.RefreshTrigger
import dev.ishflow.android.core.session.SessionStore
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.time.Instant

@OptIn(ExperimentalCoroutinesApi::class)
class SalesListViewModelTest {
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
    fun `triggers reload on RefreshTrigger emit`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        val trigger = RefreshTrigger { 0L }
        val emptyDocs = DocumentListResponse(
            items = emptyList(),
            total = 0,
            page = 1,
            pageSize = 20,
        )
        coEvery { api.listDocuments("sales.invoice") } returns emptyDocs

        val vm = SalesListViewModel(api, trigger, SessionStore())
        assertNotNull(vm)
        advanceUntilIdle()
        coVerify(exactly = 1) { api.listDocuments("sales.invoice") }
        trigger.fire(0)
        advanceUntilIdle()
        coVerify(exactly = 2) { api.listDocuments("sales.invoice") }
    }
}
