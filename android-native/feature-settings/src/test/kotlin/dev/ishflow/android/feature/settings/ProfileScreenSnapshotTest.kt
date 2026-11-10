package dev.ishflow.android.feature.settings

import androidx.compose.material3.MaterialTheme
import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import dev.ishflow.android.appshared.api.ApiException
import dev.ishflow.android.appshared.models.MeResponse
import dev.ishflow.android.appshared.models.MobileFeatures
import dev.ishflow.android.appshared.models.TenantSummary
import dev.ishflow.android.appshared.models.UserSummary
import org.junit.Rule
import org.junit.Test

class ProfileScreenSnapshotTest {
    @get:Rule
    val paparazzi = Paparazzi(deviceConfig = DeviceConfig.PIXEL_6)

    @Test
    fun loading() {
        paparazzi.snapshot {
            MaterialTheme {
                ProfileContent(
                    state = ProfileUiState.Loading,
                    onRetry = { },
                    onOpenTenantSwitch = { },
                )
            }
        }
    }

    @Test
    fun loaded() {
        val me = MeResponse(
            user = UserSummary(
                id = "user-1",
                email = "admin@ishflow.com",
                firstName = "Admin",
                lastName = "User",
            ),
            tenant = TenantSummary(
                id = "tenant-1",
                slug = "demo",
                name = "Demo Şirket",
                currency = "TRY",
                mobileFeatures = MobileFeatures(),
            ),
            permissions = listOf("admin"),
            tenants = emptyList(),
        )
        paparazzi.snapshot {
            MaterialTheme {
                ProfileContent(
                    state = ProfileUiState.Loaded(me = me),
                    onRetry = { },
                    onOpenTenantSwitch = { },
                )
            }
        }
    }

    @Test
    fun failedHttp401() {
        paparazzi.snapshot {
            MaterialTheme {
                ProfileContent(
                    state = ProfileUiState.Failed(ApiException.Http(401, null)),
                    onRetry = { },
                    onOpenTenantSwitch = { },
                )
            }
        }
    }
}
