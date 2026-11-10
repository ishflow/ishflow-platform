package dev.ishflow.android.feature.settings

import androidx.compose.material3.MaterialTheme
import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import dev.ishflow.android.feature.settings.account.AccountBody
import org.junit.Rule
import org.junit.Test

class AccountSettingsScreenSnapshotTest {
    @get:Rule
    val paparazzi = Paparazzi(deviceConfig = DeviceConfig.PIXEL_6)

    @Test
    fun idle() {
        paparazzi.snapshot {
            MaterialTheme {
                AccountBody(
                    deleting = false,
                    onDeleteClick = {},
                )
            }
        }
    }

    @Test
    fun deleting() {
        paparazzi.snapshot {
            MaterialTheme {
                AccountBody(
                    deleting = true,
                    onDeleteClick = {},
                )
            }
        }
    }
}
