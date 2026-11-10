package dev.ishflow.android.feature.cari.detail.tabs

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Inventory
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ListItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import dev.ishflow.android.appshared.models.ProductMovementSummary
import dev.ishflow.android.appshared.ui.EmptyState
import dev.ishflow.android.feature.cari.R

/**
 * Stock movements tab inside Customer / Supplier 360.
 *
 * Displays per-product purchase totals aggregated by the server across all
 * non-draft invoices for this counterparty. For customers the products are
 * those they bought (sales invoice lines); for suppliers they are the products
 * they supplied (purchase invoice lines). The distinction is transparent here —
 * the screen just renders whatever [items] arrives from the ViewModel.
 */
@Composable
fun StockOutsTab(
    items: List<ProductMovementSummary>,
    modifier: Modifier = Modifier,
) {
    if (items.isEmpty()) {
        EmptyState(
            icon = Icons.Outlined.Inventory,
            title = stringResource(R.string.cari_stock_outs_empty_title),
            message = stringResource(R.string.cari_stock_outs_empty_message),
            modifier = modifier.fillMaxSize(),
        )
        return
    }
    LazyColumn(modifier = modifier.fillMaxSize()) {
        items(items) { item ->
            ListItem(
                headlineContent = { Text(item.productName) },
                supportingContent = item.lastDate?.let { date -> { Text(date) } },
                trailingContent = { Text(item.totalQty) },
            )
            HorizontalDivider()
        }
    }
}
