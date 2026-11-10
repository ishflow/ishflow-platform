package dev.ishflow.android.snapshot

import androidx.compose.material3.MaterialTheme
import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import dev.ishflow.android.feature.onboarding.workspace.WorkspaceSetupContent
import dev.ishflow.android.feature.onboarding.workspace.WorkspaceSetupUiState
import dev.ishflow.android.feature.onboarding.workspace.WorkspaceSetupViewModel
import org.junit.Rule
import org.junit.Test

class WorkspaceSetupScreenSnapshotTest {
    @get:Rule
    val paparazzi = Paparazzi(deviceConfig = DeviceConfig.PIXEL_6)

    private val emptyForm = WorkspaceSetupViewModel.Form(name = "", baseCurrency = "USD")
    private val filledForm = WorkspaceSetupViewModel.Form(name = "Demo Şirket", baseCurrency = "TRY")

    @Test
    fun idleEmpty() {
        paparazzi.snapshot {
            MaterialTheme {
                WorkspaceSetupContent(
                    form = emptyForm,
                    canSubmit = false,
                    uiState = WorkspaceSetupUiState.Idle,
                )
            }
        }
    }

    @Test
    fun idleFilled() {
        paparazzi.snapshot {
            MaterialTheme {
                WorkspaceSetupContent(
                    form = filledForm,
                    canSubmit = true,
                    uiState = WorkspaceSetupUiState.Idle,
                )
            }
        }
    }

    @Test
    fun submitting() {
        paparazzi.snapshot {
            MaterialTheme {
                WorkspaceSetupContent(
                    form = filledForm,
                    canSubmit = false,
                    uiState = WorkspaceSetupUiState.Submitting,
                )
            }
        }
    }
}
