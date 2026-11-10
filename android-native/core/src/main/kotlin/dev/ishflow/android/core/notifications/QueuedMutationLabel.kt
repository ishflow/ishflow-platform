package dev.ishflow.android.core.notifications

import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import dev.ishflow.android.core.R

/**
 * Maps a queued mutation's endpoint to user-facing text. Raw paths
 * (`/api/mobile/documents/sales.invoice`), HTTP methods, attempt counters and
 * server error dumps mean nothing to an end user, so the notification/sync
 * surfaces render this localized document name instead. Unknown endpoints fall
 * back to a generic "operation" label rather than leaking the raw path.
 */
@Composable
fun queuedMutationLabel(endpoint: String): String = when {
    endpoint.contains("payment_received") -> stringResource(R.string.sync_item_kind_payment_received)
    endpoint.contains("payment_sent") -> stringResource(R.string.sync_item_kind_payment_sent)
    endpoint.contains("purchase") -> stringResource(R.string.sync_item_kind_purchase_invoice)
    endpoint.contains("sales") -> stringResource(R.string.sync_item_kind_sales_invoice)
    else -> stringResource(R.string.sync_item_generic)
}
