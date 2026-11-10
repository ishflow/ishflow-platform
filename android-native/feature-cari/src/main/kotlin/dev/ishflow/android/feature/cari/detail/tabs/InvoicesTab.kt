package dev.ishflow.android.feature.cari.detail.tabs

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Description
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import dev.ishflow.android.appshared.models.Customer360Invoice
import dev.ishflow.android.appshared.ui.EmptyState
import dev.ishflow.android.feature.cari.R
import java.math.BigDecimal

/**
 * Invoices tab inside Customer 360. Shows the latest 20 invoices (server
 * already limits the page) with number, total, ISO date, and status. Empty
 * state mirrors the iOS `ContentUnavailableView` shape.
 */
@Composable
fun InvoicesTab(
    invoices: List<Customer360Invoice>,
    currency: String?,
    modifier: Modifier = Modifier,
) {
    if (invoices.isEmpty()) {
        EmptyState(
            icon = Icons.Filled.Description,
            title = stringResource(R.string.customer_360_empty_invoices),
            modifier = modifier.fillMaxSize(),
        )
        return
    }
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
    ) {
        items(invoices, key = { it.id }) { invoice ->
            InvoiceRow(invoice = invoice, currency = currency)
            HorizontalDivider()
        }
    }
}

@Composable
private fun InvoiceRow(invoice: Customer360Invoice, currency: String?) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Row(modifier = Modifier.fillMaxWidth()) {
            Text(
                text = invoice.number,
                style = MaterialTheme.typography.bodyLarge,
                modifier = Modifier.weight(1f),
            )
            Text(
                text = formatAmount(invoice.total, currency),
                style = MaterialTheme.typography.bodyLarge,
            )
        }
        Row(modifier = Modifier.fillMaxWidth()) {
            Text(
                text = invoice.date.take(10),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.weight(1f),
            )
            Text(
                text = invoice.status,
                style = MaterialTheme.typography.bodySmall,
                color = statusColor(invoice.status),
            )
        }
    }
}

internal fun formatAmount(amount: BigDecimal, currency: String?): String {
    val plain = amount.toPlainString()
    return if (currency.isNullOrBlank()) plain else "$plain $currency"
}

@Composable
internal fun statusColor(status: String) = when (status.uppercase()) {
    "POSTED" -> MaterialTheme.colorScheme.primary
    // Brand has no `tertiary`; secondary (BrandSecondary light-blue) keeps
    // SAVED visually distinct from POSTED while staying on-palette.
    "SAVED" -> MaterialTheme.colorScheme.secondary
    "CANCELLED" -> MaterialTheme.colorScheme.error
    else -> MaterialTheme.colorScheme.onSurfaceVariant
}
