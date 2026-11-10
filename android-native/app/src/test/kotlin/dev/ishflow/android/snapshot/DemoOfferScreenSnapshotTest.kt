package dev.ishflow.android.snapshot

import androidx.compose.material3.MaterialTheme
import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import dev.ishflow.android.feature.onboarding.demo.DemoOfferContent
import dev.ishflow.android.feature.onboarding.demo.DemoOfferUiState
import org.junit.Rule
import org.junit.Test

class DemoOfferScreenSnapshotTest {
    @get:Rule
    val paparazzi = Paparazzi(deviceConfig = DeviceConfig.PIXEL_6)

    @Test
    fun idle() {
        paparazzi.snapshot {
            MaterialTheme {
                DemoOfferContent(uiState = DemoOfferUiState.Idle)
            }
        }
    }

    @Test
    fun seeding() {
        paparazzi.snapshot {
            MaterialTheme {
                DemoOfferContent(uiState = DemoOfferUiState.Seeding)
            }
        }
    }
}
