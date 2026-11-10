package dev.ishflow.android.snapshot

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.Inventory
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import dev.ishflow.android.appshared.models.DocumentRecord
import dev.ishflow.android.appshared.models.DocumentStatus
import dev.ishflow.android.appshared.ui.DocumentRow
import dev.ishflow.android.appshared.ui.KPIRow
import dev.ishflow.android.appshared.ui.StatusChip
import dev.ishflow.android.theme.IshflowTheme
import org.junit.Rule
import org.junit.Test
import java.time.Instant

class DashboardSnapshotTest {
    @get:Rule
    val paparazzi = Paparazzi(deviceConfig = DeviceConfig.PIXEL_6)

    @Test
    fun kpiRowLight() {
        paparazzi.snapshot {
            IshflowTheme(darkTheme = false) {
                Column(modifier = Modifier.padding(16.dp)) {
                    KPIRow(
                        label = "Alacak",
                        value = "₺125.000,00",
                        icon = Icons.Filled.ArrowDownward,
                    )
                    KPIRow(
                        label = "Borç",
                        value = "₺45.000,00",
                        icon = Icons.Filled.ArrowUpward,
                    )
                    KPIRow(
                        label = "Stok",
                        value = "₺890.000,00",
                        icon = Icons.Filled.Inventory,
                    )
                }
            }
        }
    }

    @Test
    fun kpiRowDark() {
        paparazzi.snapshot {
            IshflowTheme(darkTheme = true) {
                Column(modifier = Modifier.padding(16.dp)) {
                    KPIRow(
                        label = "Alacak",
                        value = "₺125.000,00",
                        icon = Icons.Filled.ArrowDownward,
                    )
                    KPIRow(
                        label = "Borç",
                        value = "₺45.000,00",
                        icon = Icons.Filled.ArrowUpward,
                    )
                    KPIRow(
                        label = "Stok",
                        value = "₺890.000,00",
                        icon = Icons.Filled.Inventory,
                    )
                }
            }
        }
    }

    @Test
    fun statusChipsLight() {
        paparazzi.snapshot {
            IshflowTheme(darkTheme = false) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Status Chips",
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.padding(bottom = 8.dp),
                    )
                    StatusChip(status = DocumentStatus.DRAFT)
                    StatusChip(status = DocumentStatus.SAVED)
                    StatusChip(status = DocumentStatus.POSTED)
                    StatusChip(status = DocumentStatus.CANCELLED)
                }
            }
        }
    }

    @Test
    fun documentRowLight() {
        val record = DocumentRecord(
            id = "1",
            number = "SIP-2024-001",
            date = Instant.parse("2024-03-15T10:30:00Z"),
            status = DocumentStatus.POSTED,
            createdAt = Instant.parse("2024-03-15T10:30:00Z"),
            updatedAt = Instant.parse("2024-03-15T10:30:00Z"),
        )
        paparazzi.snapshot {
            IshflowTheme(darkTheme = false) {
                Column(modifier = Modifier.padding(16.dp)) {
                    DocumentRow(record = record)
                }
            }
        }
    }
}
