package dev.ishflow.android.feature.dashboard.widgets

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import dev.ishflow.android.R
import dev.ishflow.android.appshared.models.WidgetDescriptor
import dev.ishflow.android.feature.dashboard.kpiCount
import dev.ishflow.android.feature.dashboard.kpiValue
import java.math.BigDecimal

private const val WIDGET_RECEIVABLES = "kpi.receivables"
private const val WIDGET_PAYABLES = "kpi.payables"
private const val WIDGET_THIS_MONTH = "kpi.thisMonthSales"
private const val WIDGET_OPEN_INVOICES = "kpi.openInvoices"

/**
 * Hero card that replaces the legacy blue sparkline block.
 *
 * Renders the net cash position (`receivables - payables`) as the headline
 * number, with a single supporting line summarising this-month revenue and
 * the number of open invoices. The card consumes up to four widgets from
 * the dashboard hero slot — anything else stays in [KpiGrid] below.
 *
 * Falls back to [HeroKpiCard] when the role-aware response doesn't include
 * both receivables and payables (e.g. warehouse role): without those two
 * the "net" number is meaningless, so we let the legacy hero render the
 * role's primary widget instead.
 */
@Composable
internal fun NetPositionCard(
    hero: List<WidgetDescriptor>,
    currency: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val receivables = hero.firstOrNull { it.id == WIDGET_RECEIVABLES }
    val payables = hero.firstOrNull { it.id == WIDGET_PAYABLES }
    if (receivables == null || payables == null) {
        val fallback = hero.firstOrNull() ?: return
        HeroKpiCard(widget = fallback, currency = currency, onClick = onClick, modifier = modifier)
        return
    }
    val net = (receivables.kpiValue.toBigDecimalOrZero())
        .subtract(payables.kpiValue.toBigDecimalOrZero())
    val isNegative = net.signum() < 0
    val amountColor = if (isNegative) {
        MaterialTheme.colorScheme.error
    } else {
        MaterialTheme.colorScheme.primary
    }
    Card(
        onClick = onClick,
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
        ),
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Text(
                text = stringResource(R.string.dashboard_kpi_net_position).uppercase(),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = formatCurrency(net.toPlainString(), currency),
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold,
                color = amountColor,
                modifier = Modifier.padding(top = 6.dp),
            )
            SubtitleRow(
                thisMonth = hero.firstOrNull { it.id == WIDGET_THIS_MONTH },
                openInvoices = hero.firstOrNull { it.id == WIDGET_OPEN_INVOICES },
                currency = currency,
            )
        }
    }
}

/**
 * Returns the set of widget ids consumed by [NetPositionCard]. The hero
 * layout passes this to [KpiGrid] so the leftover widgets render below
 * without duplicating data already on the hero.
 *
 * Returns an empty set when the hero falls back to [HeroKpiCard] (i.e.
 * receivables OR payables missing) — in that mode the grid keeps its old
 * "drop the first widget" behaviour.
 */
internal fun netPositionConsumedIds(hero: List<WidgetDescriptor>): Set<String> {
    val hasReceivables = hero.any { it.id == WIDGET_RECEIVABLES }
    val hasPayables = hero.any { it.id == WIDGET_PAYABLES }
    return if (hasReceivables && hasPayables) {
        setOf(WIDGET_RECEIVABLES, WIDGET_PAYABLES, WIDGET_THIS_MONTH, WIDGET_OPEN_INVOICES)
    } else {
        emptySet()
    }
}

@Composable
private fun SubtitleRow(
    thisMonth: WidgetDescriptor?,
    openInvoices: WidgetDescriptor?,
    currency: String,
) {
    val pieces = mutableListOf<@Composable () -> Unit>()
    thisMonth?.let { widget ->
        pieces += { ThisMonthSegment(widget = widget, currency = currency) }
    }
    openInvoices?.let { widget ->
        pieces += { OpenInvoicesSegment(widget = widget) }
    }
    if (pieces.isEmpty()) return
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        modifier = Modifier.padding(top = 10.dp),
    ) {
        pieces.forEachIndexed { index, segment ->
            if (index > 0) {
                Text(
                    text = "·",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            segment()
        }
    }
}

@Composable
private fun ThisMonthSegment(widget: WidgetDescriptor, currency: String) {
    val amount = widget.kpiValue.toBigDecimalOrZero()
    val arrow = if (amount.signum() < 0) Icons.Filled.ArrowDownward else Icons.Filled.ArrowUpward
    val color = if (amount.signum() < 0) {
        Color(0xFFC62828)
    } else {
        Color(0xFF2E7D32)
    }
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Icon(arrow, contentDescription = null, modifier = Modifier.size(14.dp), tint = color)
        Text(
            text = stringResource(R.string.dashboard_net_delta_this_month),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            text = formatCurrency(widget.kpiValue, currency),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
private fun OpenInvoicesSegment(widget: WidgetDescriptor) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(
            text = stringResource(R.string.dashboard_net_open_invoices),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            text = (widget.kpiCount ?: 0).toString(),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

private fun String?.toBigDecimalOrZero(): BigDecimal =
    this?.let { runCatching { BigDecimal(it) }.getOrNull() } ?: BigDecimal.ZERO
