package dev.ishflow.android.appshared.ui

import androidx.compose.material3.Text
import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import org.junit.Rule
import org.junit.Test

class PullRefreshHostSnapshot {
    @get:Rule
    val paparazzi = Paparazzi(deviceConfig = DeviceConfig.PIXEL_6)

    @Test
    fun idle() = paparazzi.snapshot {
        PullRefreshHost(isRefreshing = false, onRefresh = {}) {
            Text("Content")
        }
    }

    @Test
    fun refreshing() = paparazzi.snapshot {
        PullRefreshHost(isRefreshing = true, onRefresh = {}) {
            Text("Content")
        }
    }
}
