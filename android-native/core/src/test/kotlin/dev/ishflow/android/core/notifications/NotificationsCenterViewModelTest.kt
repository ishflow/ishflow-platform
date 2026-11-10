package dev.ishflow.android.core.notifications

import app.cash.turbine.test
import dev.ishflow.android.core.db.PendingMutationDao
import dev.ishflow.android.core.db.PendingMutationEntity
import dev.ishflow.android.core.db.PushNotificationDao
import dev.ishflow.android.core.db.PushNotificationEntity
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals

@OptIn(ExperimentalCoroutinesApi::class)
class NotificationsCenterViewModelTest {
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
    fun `state combines three sources into a single snapshot`() = runTest(testDispatcher) {
        val push = listOf(
            PushNotificationEntity(
                id = "n1",
                title = "Welcome",
                body = "Onboarding done",
                dataJson = null,
                receivedAt = 1_000L,
                readAt = null,
            ),
        )
        val outbox = listOf(
            PendingMutationEntity(
                id = "m1",
                endpoint = "/api/mobile/sales",
                method = "POST",
                body = "{}",
                idempotencyKey = "idem-1",
                status = "pending",
                createdAt = 2_000L,
            ),
        )
        val errors = listOf(
            PendingMutationEntity(
                id = "m2",
                endpoint = "/api/mobile/payments",
                method = "POST",
                body = "{}",
                idempotencyKey = "idem-2",
                status = "failed",
                attempts = 5,
                lastError = "timeout",
                createdAt = 3_000L,
            ),
        )

        val pushDao = mockk<PushNotificationDao>()
        val pendingDao = mockk<PendingMutationDao>()
        every { pushDao.observe() } returns flowOf(push)
        every { pendingDao.observePending() } returns flowOf(outbox)
        every { pendingDao.observeFailed() } returns flowOf(errors)

        val vm = NotificationsCenterViewModel(pushDao, pendingDao)

        vm.state.test {
            // Skip the initial Empty value emitted before the upstream combine
            // has propagated.
            skipItems(1)
            val state = awaitItem()
            assertEquals(push, state.recent)
            assertEquals(outbox, state.outbox)
            assertEquals(errors, state.errors)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `state caps recent and errors to ten items`() = runTest(testDispatcher) {
        val push = (1..15).map {
            PushNotificationEntity(
                id = "n$it",
                title = "T$it",
                body = "",
                dataJson = null,
                receivedAt = it.toLong(),
                readAt = null,
            )
        }
        val errors = (1..15).map {
            PendingMutationEntity(
                id = "e$it",
                endpoint = "/api/mobile/x",
                method = "POST",
                body = "{}",
                idempotencyKey = "idem-$it",
                status = "failed",
                attempts = 5,
                lastError = "x",
                createdAt = it.toLong(),
            )
        }
        val pushDao = mockk<PushNotificationDao>()
        val pendingDao = mockk<PendingMutationDao>()
        every { pushDao.observe() } returns flowOf(push)
        every { pendingDao.observePending() } returns flowOf(emptyList())
        every { pendingDao.observeFailed() } returns flowOf(errors)

        val vm = NotificationsCenterViewModel(pushDao, pendingDao)

        vm.state.test {
            skipItems(1)
            val state = awaitItem()
            assertEquals(10, state.recent.size)
            assertEquals(10, state.errors.size)
            assertEquals(emptyList(), state.outbox)
            cancelAndIgnoreRemainingEvents()
        }
    }
}
