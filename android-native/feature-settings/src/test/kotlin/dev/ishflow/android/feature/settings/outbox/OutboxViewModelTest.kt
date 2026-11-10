package dev.ishflow.android.feature.settings.outbox

import app.cash.turbine.test
import dev.ishflow.android.core.SyncQueue
import dev.ishflow.android.core.db.PendingMutationDao
import dev.ishflow.android.core.db.PendingMutationEntity
import io.mockk.coVerify
import io.mockk.coVerifyOrder
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
import kotlin.test.assertEquals

@OptIn(ExperimentalCoroutinesApi::class)
class OutboxViewModelTest {

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
    fun `retry forwards id to syncQueue`() = runTest(testDispatcher) {
        val syncQueue = mockk<SyncQueue>(relaxed = true)
        val dao = mockk<PendingMutationDao>()
        every { dao.observePending() } returns flowOf(emptyList())

        val vm = OutboxViewModel(syncQueue, dao)
        vm.retry("m-123")
        advanceUntilIdle()

        coVerify(exactly = 1) { syncQueue.retry("m-123") }
    }

    @Test
    fun `retryAll forwards each pending id in order`() = runTest(testDispatcher) {
        val syncQueue = mockk<SyncQueue>(relaxed = true)
        val dao = mockk<PendingMutationDao>()
        val mutations = listOf(
            PendingMutationEntity(
                id = "m1",
                endpoint = "/api/mobile/sales",
                method = "POST",
                body = "{}",
                idempotencyKey = "i1",
                createdAt = 1_000L,
            ),
            PendingMutationEntity(
                id = "m2",
                endpoint = "/api/mobile/purchase",
                method = "POST",
                body = "{}",
                idempotencyKey = "i2",
                createdAt = 2_000L,
            ),
        )
        every { dao.observePending() } returns flowOf(mutations)

        val vm = OutboxViewModel(syncQueue, dao)

        // Wait for the upstream flow to populate the StateFlow before invoking retryAll.
        vm.pending.test {
            // Initial empty emission from stateIn's seed.
            skipItems(1)
            assertEquals(mutations, awaitItem())
            cancelAndIgnoreRemainingEvents()
        }

        vm.retryAll()
        advanceUntilIdle()

        coVerifyOrder {
            syncQueue.retry("m1")
            syncQueue.retry("m2")
        }
    }

    @Test
    fun `pending exposes observePending values`() = runTest(testDispatcher) {
        val syncQueue = mockk<SyncQueue>(relaxed = true)
        val dao = mockk<PendingMutationDao>()
        val mutations = listOf(
            PendingMutationEntity(
                id = "only",
                endpoint = "/api/mobile/sales/payment_received",
                method = "POST",
                body = "{}",
                idempotencyKey = "i",
                createdAt = 1_000L,
            ),
        )
        every { dao.observePending() } returns flowOf(mutations)

        val vm = OutboxViewModel(syncQueue, dao)

        vm.pending.test {
            skipItems(1)
            assertEquals(mutations, awaitItem())
            cancelAndIgnoreRemainingEvents()
        }
    }
}
