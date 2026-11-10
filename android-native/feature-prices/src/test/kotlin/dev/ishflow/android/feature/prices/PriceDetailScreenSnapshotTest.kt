package dev.ishflow.android.feature.prices

import androidx.compose.material3.MaterialTheme
import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import dev.ishflow.android.appshared.api.ApiException
import dev.ishflow.android.appshared.models.CatalogRecord
import org.junit.Rule
import org.junit.Test
import java.time.Instant

class PriceDetailScreenSnapshotTest {
    @get:Rule
    val paparazzi = Paparazzi(deviceConfig = DeviceConfig.PIXEL_6)

    @Test
    fun loading() {
        paparazzi.snapshot {
            MaterialTheme {
                PriceDetailScreenContent(
                    uiState = PriceDetailUiState.Loading,
                    onRetry = { },
                )
            }
        }
    }

    @Test
    fun loaded() {
        val record = CatalogRecord(
            id = "price-1",
            code = "F01",
            name = "Fiyat Listesi 2024",
            createdAt = Instant.parse("2024-01-01T00:00:00Z"),
            updatedAt = Instant.parse("2024-06-01T00:00:00Z"),
        )
        paparazzi.snapshot {
            MaterialTheme {
                PriceDetailScreenContent(
                    uiState = PriceDetailUiState.Loaded(record = record),
                    onRetry = { },
                )
            }
        }
    }

    @Test
    fun failedHttp404() {
        paparazzi.snapshot {
            MaterialTheme {
                PriceDetailScreenContent(
                    uiState = PriceDetailUiState.Failed(ApiException.Http(404, null)),
                    onRetry = { },
                )
            }
        }
    }

    @Test
    fun failedDecoding() {
        paparazzi.snapshot {
            MaterialTheme {
                PriceDetailScreenContent(
                    uiState = PriceDetailUiState.Failed(ApiException.Decoding(IllegalArgumentException("Invalid response"))),
                    onRetry = { },
                )
            }
        }
    }
}
