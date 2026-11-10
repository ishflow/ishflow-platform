package dev.ishflow.android.appshared.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * Rounded surfaceVariant rectangle used as a content placeholder while a
 * detail screen is loading. Sized via [heightDp] so callers can match the
 * approximate footprint of the real content (header card, line row, etc).
 */
@Composable
fun SkeletonBlock(modifier: Modifier = Modifier, heightDp: Int = 16) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(heightDp.dp)
            .background(
                color = MaterialTheme.colorScheme.surfaceVariant,
                shape = MaterialTheme.shapes.small,
            ),
    )
}

/**
 * Standard document-detail skeleton: one header block plus three line-shaped
 * blocks. Shared between Sales and Purchase invoice detail screens so they
 * can't drift out of sync visually.
 */
@Composable
fun DocDetailSkeleton(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        SkeletonBlock(heightDp = 72)
        repeat(3) {
            SkeletonBlock(heightDp = 56)
        }
    }
}
