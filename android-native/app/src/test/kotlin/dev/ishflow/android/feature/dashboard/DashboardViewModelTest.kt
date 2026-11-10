package dev.ishflow.android.feature.dashboard

import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.DashboardResponse
import dev.ishflow.android.appshared.models.DocumentListResponse
import dev.ishflow.android.appshared.models.RegisterBalanceResponse
import dev.ishflow.android.core.RefreshTrigger
import dev.ishflow.android.core.store.DashboardPreferences
import dev.ishflow.android.core.store.DashboardStyle
import dev.ishflow.android.core.store.DashboardStyleStore
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.flowOf
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

@OptIn(ExperimentalCoroutinesApi::class)
class DashboardViewModelTest {
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
        val emptyBalance = RegisterBalanceResponse(
            register = "",
            asOf = null,
            rows = emptyList(),
        )
        val emptyDocs = DocumentListResponse(
            items = emptyList(),
            total = 0,
            page = 1,
            pageSize = 20,
        )
        coEvery { api.registerBalance(any()) } returns emptyBalance
        coEvery { api.listDocuments(any(), pageSize = any()) } returns emptyDocs
        coEvery { api.getDashboardLayout() } returns DashboardResponse()

        val styleStore = mockk<DashboardStyleStore>()
        every { styleStore.style } returns flowOf(DashboardStyle.HERO)
        val prefs = mockk<DashboardPreferences>()
        every { prefs.setupProgressDismissed } returns flowOf(false)
        val vm = DashboardViewModel(api, trigger, styleStore, prefs)
        assertNotNull(vm)
        advanceUntilIdle()
        coVerify(exactly = 1) { api.registerBalance("ar.receivable") }
        trigger.fire(0)
        advanceUntilIdle()
        coVerify(exactly = 2) { api.registerBalance("ar.receivable") }
    }
}
