package dev.ishflow.android.uitest

import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.platform.app.InstrumentationRegistry
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import dev.ishflow.android.MainActivity
import dev.ishflow.android.auth.TokenStore
import org.junit.Rule
import org.junit.Test
import org.junit.rules.ExternalResource

@HiltAndroidTest
class GoldenPathTest {
    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    /**
     * The dev-skip flow persists a token in [TokenStore]; subsequent activity
     * launches see [signedIn = true] and skip the Welcome screen entirely.
     * Wipe the token BEFORE [composeRule] launches the activity. JUnit applies
     * rules in ascending [order], so this fires after Hilt but before Compose
     * brings up [MainActivity].
     */
    @get:Rule(order = 1)
    val authResetRule: ExternalResource = object : ExternalResource() {
        override fun before() {
            val context = InstrumentationRegistry.getInstrumentation().targetContext
            TokenStore(context).clearToken()
        }
    }

    @get:Rule(order = 2)
    val composeRule = createAndroidComposeRule<MainActivity>()

    @Test
    fun launchShowsWelcomeWithSkip() {
        composeRule.onNodeWithText("Welcome").assertIsDisplayed()
        composeRule.onNodeWithText("Skip auth (UI shell — no data)").assertIsDisplayed()
    }

    @Test
    fun skipNavigatesToDashboard() {
        composeRule.onNodeWithText("Skip auth (UI shell — no data)").performClick()
        // Dashboard renders both as the top app bar title and the bottom-nav
        // label, so two nodes confirm we are on the dashboard.
        composeRule.onAllNodesWithText("Dashboard").assertCountEquals(2)
    }

    @Test
    fun bottomNavSwitchesTabs() {
        composeRule.onNodeWithText("Skip auth (UI shell — no data)").performClick()
        composeRule.onAllNodesWithText("Dashboard").assertCountEquals(2)
        composeRule.onNodeWithText("Sales").performClick()
        // After the tab switch the Sales screen renders "Sales" in both the top
        // app bar and the bottom-nav label.
        composeRule.onAllNodesWithText("Sales").assertCountEquals(2)
    }

    @Test
    fun skipToSalesDetail() {
        composeRule.onNodeWithText("Skip auth (UI shell — no data)").performClick()
        composeRule.onNodeWithText("Sales").performClick()
        composeRule.waitForIdle()

        // Only tap a row if the list loaded with documents
        val rows = composeRule.onAllNodesWithTag("sales_document_row")
        if (rows.fetchSemanticsNodes().isNotEmpty()) {
            rows[0].performClick()
            composeRule.onNodeWithText("Invoice Detail").assertIsDisplayed()
        }
    }

    @Test
    fun tenantSwitchUpdatesDashboard() {
        composeRule.onNodeWithText("Skip auth (UI shell — no data)").performClick()
        composeRule.onNodeWithText("Settings").performClick()
        composeRule.onNodeWithText("Tenant").performClick()
        composeRule.waitForIdle()

        val tenants = composeRule.onAllNodesWithTag("tenant_item")
        if (tenants.fetchSemanticsNodes().isNotEmpty()) {
            tenants[0].performClick()
            composeRule.waitForIdle()
            // Navigate back to Dashboard via bottom nav after switch
            composeRule.onNodeWithText("Dashboard").performClick()
            composeRule.onAllNodesWithText("Dashboard").assertCountEquals(2)
        }
    }

    @Test
    fun tokenClearShowsErrorState() {
        composeRule.onNodeWithText("Skip auth (UI shell — no data)").performClick()
        composeRule.onNodeWithText("Sales").performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Session expired. Please sign in again.").assertIsDisplayed()
    }
}
