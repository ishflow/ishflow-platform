package dev.ishflow.android.feature.dashboard.widgets

import androidx.annotation.StringRes
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.HelpOutline
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Inventory
import androidx.compose.ui.graphics.vector.ImageVector
import dev.ishflow.android.R
import dev.ishflow.android.feature.dashboard.kpiCount
import dev.ishflow.android.feature.dashboard.kpiDelta
import dev.ishflow.android.feature.dashboard.kpiSparkline
import dev.ishflow.android.feature.dashboard.kpiValue
import dev.ishflow.android.appshared.models.WidgetDescriptor
import java.math.BigDecimal
import java.text.NumberFormat
import java.util.Currency
import java.util.Locale

/**
 * Render-side metadata for a single KPI widget — the label, formatted value,
 * percentage delta, the "vs X days" comparison label, and the icon to show.
 * Mirrors the iOS `kpiMeta(for:)` switch so both clients render identically
 * for the same widget id.
 */
internal data class KpiMeta(
    @StringRes val labelRes: Int,
    val value: String,
    val deltaPct: Double,
    @StringRes val deltaLabelRes: Int,
    val icon: ImageVector,
    /**
     * Time-series for the hero sparkline. Server emits as `data.series` when
     * available; otherwise we render a synthetic preview from `deltaPct` so
     * the visual ships ahead of the server contract.
     */
    val sparkline: List<Double>? = null,
)

internal fun WidgetDescriptor.toKpiMeta(currency: String): KpiMeta = when (id) {
    "kpi.receivables" -> KpiMeta(
        labelRes = R.string.dashboard_kpi_ar_total,
        value = formatCurrency(kpiValue, currency),
        deltaPct = kpiDelta ?: 0.0,
        deltaLabelRes = R.string.dashboard_delta_vs_30_days,
        icon = Icons.Filled.ArrowDownward,
        sparkline = kpiSparkline,
    )
    "kpi.payables" -> KpiMeta(
        labelRes = R.string.dashboard_kpi_ap_total,
        value = formatCurrency(kpiValue, currency),
        deltaPct = kpiDelta ?: 0.0,
        deltaLabelRes = R.string.dashboard_delta_vs_30_days,
        icon = Icons.Filled.ArrowUpward,
        sparkline = kpiSparkline,
    )
    "kpi.thisMonthSales" -> KpiMeta(
        labelRes = R.string.dashboard_kpi_this_month_sales,
        value = formatCurrency(kpiValue, currency),
        deltaPct = kpiDelta ?: 0.0,
        deltaLabelRes = R.string.dashboard_delta_vs_last_month,
        icon = Icons.AutoMirrored.Filled.TrendingUp,
        sparkline = kpiSparkline,
    )
    "kpi.openInvoices" -> KpiMeta(
        labelRes = R.string.dashboard_kpi_open_invoices,
        value = (kpiCount ?: 0).toString(),
        deltaPct = kpiDelta ?: 0.0,
        deltaLabelRes = R.string.dashboard_delta_vs_7_days,
        icon = Icons.Filled.Description,
        sparkline = kpiSparkline,
    )
    "kpi.cashPosition" -> KpiMeta(
        labelRes = R.string.dashboard_kpi_cash_position,
        value = formatCurrency(kpiValue, currency),
        deltaPct = kpiDelta ?: 0.0,
        deltaLabelRes = R.string.dashboard_delta_vs_30_days,
        icon = Icons.Filled.AccountBalanceWallet,
        sparkline = kpiSparkline,
    )
    "kpi.lowStockCount" -> KpiMeta(
        labelRes = R.string.dashboard_kpi_low_stock_count,
        value = (kpiCount ?: 0).toString(),
        deltaPct = 0.0,
        deltaLabelRes = R.string.dashboard_delta_vs_30_days,
        icon = Icons.Filled.Inventory,
        sparkline = kpiSparkline,
    )
    else -> KpiMeta(
        labelRes = R.string.empty_title,
        value = kpiValue ?: (kpiCount?.toString() ?: "0"),
        deltaPct = 0.0,
        deltaLabelRes = R.string.dashboard_delta_vs_30_days,
        icon = Icons.AutoMirrored.Filled.HelpOutline,
        sparkline = kpiSparkline,
    )
}

/**
 * Formats a raw decimal-string amount with the active tenant currency.
 * Falls back to a plain decimal when the currency code is unknown so the
 * value still renders rather than crashing.
 */
internal fun formatCurrency(raw: String?, currency: String): String {
    val amount = raw?.let { runCatching { BigDecimal(it) }.getOrNull() } ?: BigDecimal.ZERO
    val formatter = NumberFormat.getCurrencyInstance(Locale.getDefault())
    runCatching { formatter.currency = Currency.getInstance(currency) }
    return formatter.format(amount)
}
