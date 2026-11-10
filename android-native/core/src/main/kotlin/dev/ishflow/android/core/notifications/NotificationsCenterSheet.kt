package dev.ishflow.android.core.notifications

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.ishflow.android.core.R
import dev.ishflow.android.core.db.PendingMutationEntity
import dev.ishflow.android.core.db.PushNotificationEntity
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

/**
 * Bottom sheet mirroring the iOS `NotificationsCenterSheet`. Stacks the
 * three notification surfaces (recent push, outbox, errors) into a single
 * scrollable view so users can triage everything from one entry point.
 *
 * Triggered from the more sheet's Notifications row.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsCenterSheet(
    onDismiss: () -> Unit,
    viewModel: NotificationsCenterViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    ModalBottomSheet(onDismissRequest = onDismiss) {
        LazyColumn(
            modifier = Modifier.padding(horizontal = HORIZONTAL_PADDING_DP.dp),
            contentPadding = PaddingValues(bottom = BOTTOM_PADDING_DP.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            item { SectionHeader(stringResource(R.string.notifications_center_title)) }
            recentSection(state.recent)
            item { HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp)) }
            outboxSection(state.outbox)
            item { HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp)) }
            errorsSection(state.errors)
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.recentSection(items: List<PushNotificationEntity>) {
    item {
        SectionLabel(textRes = R.string.notifications_section_recent)
    }
    if (items.isEmpty()) {
        item { EmptyRow() }
    } else {
        items(items, key = { it.id }) { row ->
            ListItem(
                headlineContent = { Text(row.title) },
                supportingContent = {
                    Text(formatRecentSubtitle(row), style = MaterialTheme.typography.bodySmall)
                },
            )
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.outboxSection(items: List<PendingMutationEntity>) {
    item {
        SectionLabel(textRes = R.string.notifications_section_outbox)
    }
    if (items.isEmpty()) {
        item { EmptyRow() }
    } else {
        items(items, key = { it.id }) { mutation ->
            ListItem(
                headlineContent = { Text(queuedMutationLabel(mutation.endpoint)) },
                supportingContent = {
                    Text(
                        stringResource(R.string.sync_item_status_waiting),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                },
            )
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.errorsSection(items: List<PendingMutationEntity>) {
    item {
        SectionLabel(textRes = R.string.notifications_section_errors)
    }
    if (items.isEmpty()) {
        item { EmptyRow() }
    } else {
        items(items, key = { it.id }) { mutation ->
            ListItem(
                headlineContent = { Text(queuedMutationLabel(mutation.endpoint)) },
                supportingContent = {
                    Text(
                        stringResource(R.string.sync_item_status_failed),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                    )
                },
            )
        }
    }
}

@Composable
private fun SectionHeader(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.titleMedium,
        color = MaterialTheme.colorScheme.onSurface,
        modifier = Modifier.padding(vertical = 8.dp),
    )
}

@Composable
private fun SectionLabel(textRes: Int) {
    Text(
        text = stringResource(textRes),
        style = MaterialTheme.typography.titleSmall,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(top = 4.dp, bottom = 4.dp),
    )
}

@Composable
private fun EmptyRow() {
    Text(
        text = stringResource(R.string.notifications_section_empty),
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(vertical = 8.dp),
    )
}

private fun formatRecentSubtitle(row: PushNotificationEntity): String {
    val formatted = formatTimestamp(row.receivedAt)
    return if (row.body.isBlank()) formatted else "${row.body} · $formatted"
}

private fun formatTimestamp(epochMs: Long): String {
    val formatter = DateTimeFormatter.ofLocalizedDateTime(FormatStyle.SHORT)
    val dateTime = LocalDateTime.ofInstant(Instant.ofEpochMilli(epochMs), ZoneId.systemDefault())
    return formatter.format(dateTime)
}

private const val HORIZONTAL_PADDING_DP = 16
private const val BOTTOM_PADDING_DP = 24
