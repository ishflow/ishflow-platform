package dev.ishflow.android.snapshot

import androidx.compose.material3.MaterialTheme
import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import dev.ishflow.android.appshared.api.ApiException
import dev.ishflow.android.appshared.models.DocumentLine
import dev.ishflow.android.appshared.models.DocumentRecord
import dev.ishflow.android.appshared.models.DocumentStatus
import dev.ishflow.android.appshared.models.LinkedInvoiceRef
import dev.ishflow.android.appshared.models.PartyRef
import dev.ishflow.android.feature.genericdoc.GenericDocDetailContent
import dev.ishflow.android.feature.genericdoc.GenericDocDetailUiState
import org.junit.Rule
import org.junit.Test
import java.time.Instant

class GenericDocDetailSnapshotTest {
    @get:Rule
    val paparazzi = Paparazzi(deviceConfig = DeviceConfig.PIXEL_6)

    @Test
    fun loading() {
        paparazzi.snapshot {
            MaterialTheme {
                GenericDocDetailContent(
                    uiState = GenericDocDetailUiState.Loading,
                    type = "sales.payment_received",
                    onRetry = {},
                )
            }
        }
    }

    @Test
    fun loadedPaymentReceived() {
        val document = DocumentRecord(
            id = "pay-1",
            number = "PAY-2024-001",
            date = Instant.parse("2024-03-15T10:30:00Z"),
            status = DocumentStatus.POSTED,
            createdAt = Instant.parse("2024-03-15T10:30:00Z"),
            updatedAt = Instant.parse("2024-03-15T10:30:00Z"),
            customer = PartyRef(id = "c-1", name = "Acme Corp"),
            total = "12500.00",
            linkedInvoices = listOf(
                LinkedInvoiceRef(invoiceId = "inv-1", invoiceNumber = "SIP-2024-003", amount = "12500.00"),
            ),
            items = listOf(
                DocumentLine(
                    id = "line-1",
                    productId = "p-1",
                    productName = "Widget A",
                    quantity = "10",
                    price = "1250.00",
                    total = "12500.00",
                ),
            ),
        )
        paparazzi.snapshot {
            MaterialTheme {
                GenericDocDetailContent(
                    uiState = GenericDocDetailUiState.Loaded(document),
                    type = "sales.payment_received",
                    onRetry = {},
                )
            }
        }
    }

    @Test
    fun failed() {
        paparazzi.snapshot {
            MaterialTheme {
                GenericDocDetailContent(
                    uiState = GenericDocDetailUiState.Failed(ApiException.Http(404, null)),
                    type = "sales.payment_received",
                    onRetry = {},
                )
            }
        }
    }
}
