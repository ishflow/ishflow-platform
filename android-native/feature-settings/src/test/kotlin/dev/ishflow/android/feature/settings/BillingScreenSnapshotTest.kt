package dev.ishflow.android.feature.settings

import androidx.compose.material3.MaterialTheme
import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import dev.ishflow.android.appshared.models.BillingResponse
import dev.ishflow.android.feature.settings.billing.BillingContent
import org.junit.Rule
import org.junit.Test

class BillingScreenSnapshotTest {
    @get:Rule
    val paparazzi = Paparazzi(deviceConfig = DeviceConfig.PIXEL_6)

    @Test
    fun activeSubscription() {
        paparazzi.snapshot {
            MaterialTheme {
                BillingContent(
                    billing = BillingResponse(
                        plan = "pro",
                        status = "active",
                        trialEnd = null,
                    ),
                    onOpenPortal = {},
                )
            }
        }
    }

    @Test
    fun trialingWithExpiry() {
        paparazzi.snapshot {
            MaterialTheme {
                BillingContent(
                    billing = BillingResponse(
                        plan = "starter",
                        status = "trialing",
                        trialEnd = "2024-06-30",
                    ),
                    onOpenPortal = {},
                )
            }
        }
    }

    @Test
    fun pastDue() {
        paparazzi.snapshot {
            MaterialTheme {
                BillingContent(
                    billing = BillingResponse(
                        plan = "business",
                        status = "past_due",
                        trialEnd = null,
                    ),
                    onOpenPortal = {},
                )
            }
        }
    }

    @Test
    fun cancelled() {
        paparazzi.snapshot {
            MaterialTheme {
                BillingContent(
                    billing = BillingResponse(
                        plan = "free",
                        status = "cancelled",
                        trialEnd = null,
                    ),
                    onOpenPortal = {},
                )
            }
        }
    }
}
