package dev.ishflow.android.feature.settings.outbox

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.ishflow.android.core.db.PendingMutationEntity
import dev.ishflow.android.feature.settings.R
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

/**
 * Outbox screen — Material 3 list of mutations still queued for sync.
 * Each row offers a single retry; the top bar exposes a Retry-all action
 * when the list is non-empty.
 *
 * Mirrors iOS `OutboxQueueSheet`. Failed mutations (status = "failed")
 * stay in the existing Sync Errors screen — this view is pending-only.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OutboxScreen(
    onBack: () -> Unit,
    viewModel: OutboxViewModel = hiltViewModel(),
) {
    val items by viewModel.pending.collectAsStateWithLifecycle()
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.outbox_title)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.action_back),
                        )
                    }
                },
                actions = {
                    if (items.isNotEmpty()) {
                        TextButton(onClick = { viewModel.retryAll() }) {
                            Text(stringResource(R.string.outbox_retry_all))
                        }
                    }
                },
            )
        },
    ) { padding ->
        if (items.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = stringResource(R.string.outbox_empty),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
            ) {
                items(items, key = { it.id }) { row ->
                    OutboxRow(
                        mutation = row,
                        onRetry = { viewModel.retry(row.id) },
                    )
                    HorizontalDivider()
                }
            }
        }
    }
}

@Composable
private fun OutboxRow(mutation: PendingMutationEntity, onRetry: () -> Unit) {
    ListItem(
        headlineContent = { Text(kindLabel(mutation.endpoint)) },
        supportingContent = {
            Text(
                text = formatTimestamp(mutation.createdAt),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        },
        trailingContent = {
            IconButton(onClick = onRetry) {
                Icon(
                    imageVector = Icons.Filled.Refresh,
                    contentDescription = stringResource(R.string.outbox_retry),
                )
            }
        },
    )
}

/**
 * Maps the queued endpoint back to a user-facing label. The mutation entity
 * stores only the HTTP endpoint (no explicit `kind` discriminator), so we
 * pattern-match the known mobile routes; unknown endpoints fall through to
 * the raw path so we never hide a row from the user.
 */
@Composable
private fun kindLabel(endpoint: String): String = when {
    endpoint.contains("payment_received") -> stringResource(R.string.outbox_kind_payment_received)
    endpoint.contains("payment_sent") -> stringResource(R.string.outbox_kind_payment_sent)
    endpoint.contains("purchase") -> stringResource(R.string.outbox_kind_purchase_invoice)
    endpoint.contains("sales") -> stringResource(R.string.outbox_kind_sales_invoice)
    else -> endpoint
}

private fun formatTimestamp(epochMs: Long): String {
    val formatter = DateTimeFormatter.ofLocalizedDateTime(FormatStyle.SHORT)
    val dateTime = LocalDateTime.ofInstant(Instant.ofEpochMilli(epochMs), ZoneId.systemDefault())
    return formatter.format(dateTime)
}
