package dev.ishflow.android.appshared.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import dev.ishflow.android.appshared.R
import dev.ishflow.android.appshared.models.DocumentStatus

@Composable
fun StatusChip(status: DocumentStatus, modifier: Modifier = Modifier) {
    val (containerColor, contentColor) = when (status) {
        DocumentStatus.POSTED -> MaterialTheme.colorScheme.primaryContainer to MaterialTheme.colorScheme.onPrimaryContainer
        DocumentStatus.DRAFT -> MaterialTheme.colorScheme.surfaceVariant to MaterialTheme.colorScheme.onSurfaceVariant
        DocumentStatus.SAVED -> MaterialTheme.colorScheme.secondaryContainer to MaterialTheme.colorScheme.onSecondaryContainer
        DocumentStatus.CANCELLED -> MaterialTheme.colorScheme.errorContainer to MaterialTheme.colorScheme.onErrorContainer
    }
    val labelRes = when (status) {
        DocumentStatus.DRAFT -> R.string.status_draft
        DocumentStatus.SAVED -> R.string.status_saved
        DocumentStatus.POSTED -> R.string.status_posted
        DocumentStatus.CANCELLED -> R.string.status_cancelled
    }
    Surface(
        modifier = modifier,
        color = containerColor,
        contentColor = contentColor,
        shape = MaterialTheme.shapes.small,
    ) {
        Text(
            text = stringResource(labelRes),
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelMedium,
        )
    }
}
