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
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import dev.ishflow.android.appshared.models.Customer360Payment
import dev.ishflow.android.appshared.ui.EmptyState
import dev.ishflow.android.feature.cari.R
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

private val DATE_FORMATTER = DateTimeFormatter
    .ofLocalizedDate(FormatStyle.MEDIUM)

/**
 * Payments tab inside Customer 360. For customers these are
 * `sales.payment_received`; for suppliers they're `purchases.payment_sent`.
 */
@Composable
fun PaymentsTab(
    payments: List<Customer360Payment>,
    currency: String?,
    modifier: Modifier = Modifier,
) {
    if (payments.isEmpty()) {
        EmptyState(
            icon = Icons.Filled.Payments,
            title = stringResource(R.string.customer_360_empty_payments),
            modifier = modifier.fillMaxSize(),
        )
        return
    }
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
    ) {
        items(payments, key = { it.id }) { payment ->
            PaymentRow(payment = payment, currency = currency)
            HorizontalDivider()
        }
    }
}

@Composable
private fun PaymentRow(payment: Customer360Payment, currency: String?) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Row(modifier = Modifier.fillMaxWidth()) {
            Text(
                text = payment.number,
                style = MaterialTheme.typography.bodyLarge,
                modifier = Modifier.weight(1f),
            )
            Text(
                text = formatAmount(payment.amount, currency),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.primary,
            )
        }
        Row(modifier = Modifier.fillMaxWidth()) {
            Text(
                text = runCatching {
                    DATE_FORMATTER.format(LocalDate.parse(payment.date))
                }.getOrElse { payment.date.take(10) },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.weight(1f),
            )
            Text(
                text = payment.status,
                style = MaterialTheme.typography.bodySmall,
                color = statusColor(payment.status),
            )
        }
    }
}
