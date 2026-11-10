package dev.ishflow.android.feature.dashboard.layouts

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import dev.ishflow.android.R
import dev.ishflow.android.appshared.models.WidgetDescriptor
import dev.ishflow.android.feature.dashboard.DashboardActions
import dev.ishflow.android.feature.dashboard.DashboardLayoutBundle
import dev.ishflow.android.feature.dashboard.dispatchKpiTile
import dev.ishflow.android.feature.dashboard.kpiDelta
import dev.ishflow.android.feature.dashboard.kpiSparkline
import dev.ishflow.android.feature.dashboard.widgets.HeroSparkline
import dev.ishflow.android.feature.dashboard.widgets.KpiGrid
import dev.ishflow.android.feature.dashboard.widgets.toKpiMeta

private val SECONDARY_CHART_HEIGHT = 96.dp

/**
 * Charts-forward layout — KPIs are summarised below a charts section that
 * leads with the hero sparkline. When the server emits a comparable
 * `kpi.thisMonthSales` widget we surface its sparkline as a second chart
 * (proxy for month-over-month); otherwise we repeat the hero sparkline so
 * the slot stays populated without spurious empty space.
 *
 * KPI tiles collapse into a single 2-column grid below the charts.
 */
@Composable
internal fun ChartsLayout(
    bundle: DashboardLayoutBundle,
    actions: DashboardActions,
) {
    val hero = bundle.hero.firstOrNull()
    val tiles = bundle.hero.drop(1)
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        if (hero != null) {
            HeroChartCard(widget = hero, currency = bundle.currency)
            val mom = bundle.hero.firstOrNull { it.id == "kpi.thisMonthSales" && it !== hero } ?: hero
            SecondaryChartCard(widget = mom)
        }
        if (tiles.isNotEmpty()) {
            Spacer(Modifier.height(0.dp))
            KpiGrid(
                widgets = tiles,
                currency = bundle.currency,
                onTileClick = { tile -> actions.dispatchKpiTile(tile.id) },
            )
        }
    }
}

@Composable
private fun HeroChartCard(widget: WidgetDescriptor, currency: String) {
    val meta = widget.toKpiMeta(currency)
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Text(
                text = stringResource(meta.labelRes).uppercase(),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f),
            )
            Text(
                text = meta.value,
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
                modifier = Modifier.padding(top = 6.dp),
            )
            HeroSparkline(
                points = widget.kpiSparkline,
                deltaPct = widget.kpiDelta ?: 0.0,
                modifier = Modifier.padding(top = 12.dp),
            )
        }
    }
}

@Composable
private fun SecondaryChartCard(widget: WidgetDescriptor) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = stringResource(R.string.dashboard_delta_vs_last_month),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            HeroSparkline(
                points = widget.kpiSparkline,
                deltaPct = widget.kpiDelta ?: 0.0,
                modifier = Modifier
                    .padding(top = 8.dp)
                    .height(SECONDARY_CHART_HEIGHT),
            )
        }
    }
}
