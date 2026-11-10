package dev.ishflow.android.appshared.ui

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import org.junit.Rule
import org.junit.Test

class StatePrimitivesSnapshot {
    @get:Rule
    val paparazzi = Paparazzi(deviceConfig = DeviceConfig.PIXEL_6)

    @Test
    fun emptyState_minimal() = paparazzi.snapshot {
        EmptyState(
            icon = Icons.Filled.Search,
            title = "No items found",
        )
    }

    @Test
    fun emptyState_withMessage() = paparazzi.snapshot {
        EmptyState(
            icon = Icons.Filled.Search,
            title = "No items found",
            message = "Try adjusting your search or filters to find what you're looking for.",
        )
    }

    @Test
    fun emptyState_withCta() = paparazzi.snapshot {
        EmptyState(
            icon = Icons.Filled.Search,
            title = "No items found",
            message = "Try adjusting your search or filters to find what you're looking for.",
            ctaLabel = "Clear Filters",
            onCtaClick = {},
        )
    }

    @Test
    fun errorState_default() = paparazzi.snapshot {
        ErrorState(
            title = "Something went wrong",
            message = "Unable to load data. Please check your connection and try again.",
            ctaLabel = "Retry",
            onCtaClick = {},
        )
    }

    @Test
    fun errorState_customIcon() = paparazzi.snapshot {
        ErrorState(
            icon = Icons.Filled.Search,
            title = "Search failed",
            message = "The search service is temporarily unavailable.",
        )
    }
}
