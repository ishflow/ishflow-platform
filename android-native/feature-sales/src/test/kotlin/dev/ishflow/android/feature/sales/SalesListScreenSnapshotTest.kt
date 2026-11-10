package dev.ishflow.android.feature.sales

import androidx.compose.material3.MaterialTheme
import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import dev.ishflow.android.appshared.api.ApiException
import dev.ishflow.android.appshared.models.DocumentRecord
import dev.ishflow.android.appshared.models.DocumentStatus
import org.junit.Rule
import org.junit.Test
import java.time.Instant

class SalesListScreenSnapshotTest {
    @get:Rule
    val paparazzi = Paparazzi(deviceConfig = DeviceConfig.PIXEL_6)

    @Test
    fun loading() {
        paparazzi.snapshot {
            MaterialTheme {
                SalesListScreenContent(
                    uiState = SalesListUiState.Loading,
                    isRefreshing = false,
                    canCreate = true,
                    onRefresh = { },
                    onDocumentClick = { },
                    onNewInvoice = { },
                    onSearch = { },
                )
            }
        }
    }

    @Test
    fun loadedWithDocuments() {
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
            MaterialTheme {
                SalesListScreenContent(
                    uiState = SalesListUiState.Loaded(documents = documents, query = ""),
                    isRefreshing = false,
                    canCreate = true,
                    onRefresh = { },
                    onDocumentClick = { },
                    onNewInvoice = { },
                    onSearch = { },
                )
            }
        }
    }

    @Test
    fun failed() {
        paparazzi.snapshot {
            MaterialTheme {
                SalesListScreenContent(
                    uiState = SalesListUiState.Failed(ApiException.Http(404, null)),
                    isRefreshing = false,
                    canCreate = true,
                    onRefresh = { },
                    onDocumentClick = { },
                    onNewInvoice = { },
                    onSearch = { },
                )
            }
        }
    }

    @Test
    fun empty() {
        paparazzi.snapshot {
            MaterialTheme {
                SalesListScreenContent(
                    uiState = SalesListUiState.Loaded(documents = emptyList(), query = ""),
                    isRefreshing = false,
                    canCreate = true,
                    onRefresh = { },
                    onDocumentClick = { },
                    onNewInvoice = { },
                    onSearch = { },
                )
            }
        }
    }
}
