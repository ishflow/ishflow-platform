package dev.ishflow.android.appshared.ui

import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import dev.ishflow.android.appshared.models.DocumentStatus
import org.junit.Rule
import org.junit.Test

class StatusChipTest {
    @get:Rule
    val paparazzi = Paparazzi(deviceConfig = DeviceConfig.PIXEL_6)

    @Test
    fun draftChip() {
        paparazzi.snapshot { StatusChip(status = DocumentStatus.DRAFT) }
    }

    @Test
    fun postedChip() {
        paparazzi.snapshot { StatusChip(status = DocumentStatus.POSTED) }
    }

    @Test
    fun savedChip() {
        paparazzi.snapshot { StatusChip(status = DocumentStatus.SAVED) }
    }

    @Test
    fun cancelledChip() {
        paparazzi.snapshot { StatusChip(status = DocumentStatus.CANCELLED) }
    }
}
