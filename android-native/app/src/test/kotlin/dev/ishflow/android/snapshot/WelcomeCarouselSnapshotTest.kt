package dev.ishflow.android.snapshot

import androidx.compose.material3.MaterialTheme
import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import dev.ishflow.android.feature.onboarding.welcome.WelcomeCarousel
import org.junit.Rule
import org.junit.Test

class WelcomeCarouselSnapshotTest {
    @get:Rule
    val paparazzi = Paparazzi(deviceConfig = DeviceConfig.PIXEL_6)

    @Test
    fun firstPage() {
        paparazzi.snapshot {
            MaterialTheme {
                WelcomeCarousel(
                    onSkip = {},
                    onContinue = {},
                )
            }
        }
    }
}
