package dev.ishflow.android.uitest

import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithContentDescription
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.platform.app.InstrumentationRegistry
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import dev.ishflow.android.MainActivity
import dev.ishflow.android.auth.TokenStore
import dev.ishflow.android.core.db.PendingMutationDao
import dev.ishflow.android.core.db.PendingMutationEntity
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.ExternalResource
import java.util.UUID
import javax.inject.Inject

/**
 * End-to-end check for the sync/offline notification center. Seeds the real
 * Room queue with one failed write + one offline-waiting mutation, enters the
 * demo shell, opens the bell, and verifies the center renders human-readable
 * text ("Sales invoice" + status) rather than the raw endpoint / error dump.
 *
 * Runs visibly on the emulator (drives the actual UI). Emulator locale is
 * English, so assertions use the English strings.
 */
@HiltAndroidTest
class NotificationCenterTest {
    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    /** Clear any persisted token so the activity lands on Welcome → Skip. */
    @get:Rule(order = 1)
    val authResetRule: ExternalResource = object : ExternalResource() {
        override fun before() {
            val context = InstrumentationRegistry.getInstrumentation().targetContext
            TokenStore(context).clearToken()
        }
    }

    @get:Rule(order = 2)
    val composeRule = createAndroidComposeRule<MainActivity>()

    @Inject
    lateinit var pendingDao: PendingMutationDao

    @Before
    fun seedQueue() {
        hiltRule.inject()
        runBlocking {
            pendingDao.insert(
                PendingMutationEntity(
                    id = UUID.randomUUID().toString(),
                    endpoint = "/api/mobile/documents/sales.invoice",
                    method = "POST",
                    body = "{}",
                    idempotencyKey = UUID.randomUUID().toString(),
                    attempts = 5,
                    lastError = "java.net.ConnectException: failed to connect",
                    status = "failed",
                    createdAt = System.currentTimeMillis(),
                ),
            )
            pendingDao.insert(
                PendingMutationEntity(
                    id = UUID.randomUUID().toString(),
                    endpoint = "/api/mobile/documents/sales.invoice",
                    method = "POST",
                    body = "{}",
                    idempotencyKey = UUID.randomUUID().toString(),
                    status = "pending",
                    createdAt = System.currentTimeMillis(),
                ),
            )
        }
    }

    @Test
    fun seededSyncStateSurfacesHumanReadableTextInCenter() {
        // Enter the demo shell (the real Room queue is live even in demo mode).
        composeRule.onNodeWithText("Skip auth (UI shell — no data)").performClick()

        // Wait until the dashboard top bar (with the bell) is up.
        composeRule.waitUntil(timeoutMillis = 10_000) {
            composeRule.onAllNodesWithContentDescription("Notifications").fetchSemanticsNodes().isNotEmpty()
        }

        // Open the notification center from the top-bar bell.
        composeRule.onNodeWithContentDescription("Notifications").performClick()
        composeRule.waitForIdle()

        // Human-readable document name renders (outbox + errors sections)…
        assertTrue(
            "Expected the localized document name in the center",
            composeRule.onAllNodesWithText("Sales invoice").fetchSemanticsNodes().isNotEmpty(),
        )
        // …with plain-language status lines…
        assertTrue(
            composeRule.onAllNodesWithText("Could not be sent").fetchSemanticsNodes().isNotEmpty(),
        )
        assertTrue(
            composeRule.onAllNodesWithText("Waiting to be sent").fetchSemanticsNodes().isNotEmpty(),
        )
        // …and the raw endpoint is NOT leaked to the user.
        composeRule.onAllNodesWithText(
            "/api/mobile/documents/sales.invoice",
            substring = true,
        ).assertCountEquals(0)
    }
}
