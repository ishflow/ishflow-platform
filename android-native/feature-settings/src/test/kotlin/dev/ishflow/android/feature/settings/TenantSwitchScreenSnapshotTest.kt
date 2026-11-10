package dev.ishflow.android.feature.settings

import androidx.compose.material3.MaterialTheme
import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import dev.ishflow.android.appshared.api.ApiException
import dev.ishflow.android.appshared.models.MobileFeatures
import dev.ishflow.android.appshared.models.TenantSummary
import org.junit.Rule
import org.junit.Test

class TenantSwitchScreenSnapshotTest {
    @get:Rule
    val paparazzi = Paparazzi(deviceConfig = DeviceConfig.PIXEL_6)

    @Test
    fun loading() {
        paparazzi.snapshot {
            MaterialTheme {
                TenantSwitchContent(
                    uiState = TenantSwitchUiState.Loading,
                    onRetry = { },
                    onSwitch = { },
                )
            }
        }
    }

    @Test
    fun loaded() {
        val current = TenantSummary(
            id = "tenant-1",
            slug = "demo",
            name = "Demo Şirket",
            currency = "TRY",
            mobileFeatures = MobileFeatures(),
        )
        val available = listOf(
            current,
            TenantSummary(
                id = "tenant-2",
                slug = "test",
                name = "Test Şirket",
                currency = "TRY",
                mobileFeatures = MobileFeatures(),
            ),
        )
        paparazzi.snapshot {
            MaterialTheme {
                TenantSwitchContent(
                    uiState = TenantSwitchUiState.Loaded(current = current, available = available),
                    onRetry = { },
                    onSwitch = { },
                )
            }
        }
    }

    @Test
    fun failed() {
        paparazzi.snapshot {
            MaterialTheme {
                TenantSwitchContent(
                    uiState = TenantSwitchUiState.Failed(ApiException.Http(500, null)),
                    onRetry = { },
                    onSwitch = { },
                )
            }
        }
    }
}
