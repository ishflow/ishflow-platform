package dev.ishflow.android.snapshot

import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import dev.ishflow.android.appshared.models.DocumentRecord
import dev.ishflow.android.appshared.models.DocumentStatus
import dev.ishflow.android.feature.dashboard.DashboardScreenContent
import dev.ishflow.android.feature.dashboard.DashboardUiState
import dev.ishflow.android.theme.IshflowTheme
import org.junit.Rule
import org.junit.Test
import java.math.BigDecimal
import java.time.Instant

class DashboardScreenSnapshotTest {
    @get:Rule
    val paparazzi = Paparazzi(deviceConfig = DeviceConfig.PIXEL_6)

    @Test
    fun loading() {
        paparazzi.snapshot {
            IshflowTheme(darkTheme = false) {
                DashboardScreenContent(
                    uiState = DashboardUiState.Loading,
                    isRefreshing = false,
                    onRefresh = { },
                )
            }
        }
    }

    @Test
    fun loadedWithKpiData() {
        val documents = listOf(
            DocumentRecord(
                id = "1",
                number = "SIP-2024-001",
                date = Instant.parse("2024-03-15T10:30:00Z"),
                status = DocumentStatus.POSTED,
                createdAt = Instant.parse("2024-03-15T10:30:00Z"),
                updatedAt = Instant.parse("2024-03-15T10:30:00Z"),
            ),
            DocumentRecord(
                id = "2",
                number = "SIP-2024-002",
                date = Instant.parse("2024-03-16T14:00:00Z"),
                status = DocumentStatus.DRAFT,
                createdAt = Instant.parse("2024-03-16T14:00:00Z"),
                updatedAt = Instant.parse("2024-03-16T14:00:00Z"),
            ),
        )
        paparazzi.snapshot {
            IshflowTheme(darkTheme = false) {
                DashboardScreenContent(
                    uiState = DashboardUiState.Loaded(
                        receivable = BigDecimal("125000.00"),
                        payable = BigDecimal("45000.00"),
                        stock = BigDecimal("890000.00"),
                        recentDocuments = documents,
                    ),
                    isRefreshing = false,
                    onRefresh = { },
                )
            }
        }
    }
}
