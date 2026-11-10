package dev.ishflow.android.feature.dashboard.layouts

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import dev.ishflow.android.appshared.models.WidgetDescriptor
import dev.ishflow.android.feature.dashboard.DashboardActions
import dev.ishflow.android.feature.dashboard.DashboardLayoutBundle
import dev.ishflow.android.feature.dashboard.widgets.ActionQueueCard
import dev.ishflow.android.feature.dashboard.widgets.KpiGrid
import dev.ishflow.android.feature.dashboard.widgets.LowStockBanner
import dev.ishflow.android.feature.dashboard.widgets.NetPositionCard
import dev.ishflow.android.feature.dashboard.widgets.RecentActivityCard
import dev.ishflow.android.feature.dashboard.widgets.netPositionConsumedIds
import dev.ishflow.android.feature.dashboard.dispatchActionTarget
import dev.ishflow.android.feature.dashboard.dispatchActivityItem
import dev.ishflow.android.feature.dashboard.dispatchKpiTile

/**
 * Classic hero layout — full-width hero KPI on top, secondary KPI grid,
 * action-queue card, recent-activity list. This is the original
 * Glance-and-Act arrangement; it's been moved verbatim into the layouts/
 * package so [HeroLayout], [PastelBentoLayout] and [ChartsLayout] can be
 * swapped from a single dispatch point in [DashboardScreen].
 */
@Composable
internal fun HeroLayout(
    bundle: DashboardLayoutBundle,
    actions: DashboardActions,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp),
    ) {
        if (bundle.hero.isNotEmpty()) {
            HeroAndKpiGrid(widgets = bundle.hero, currency = bundle.currency, actions = actions)
        }
        // Low-stock banner sits between the hero KPI strip and the action
        // queue — a tappable shortcut that disappears when stock is healthy.
        LowStockBanner(
            count = bundle.lowStockCount,
            onClick = actions.onOpenInventory,
        )
        if (bundle.actions.isNotEmpty()) {
            ActionQueueCard(
                widgets = bundle.actions,
                onTargetClick = { target -> actions.dispatchActionTarget(target) },
            )
        }
        if (bundle.activity.isNotEmpty()) {
            RecentActivityCard(
                widgets = bundle.activity,
                onSeeAll = actions.onOpenDocs,
                onRowClick = { item -> actions.dispatchActivityItem(item) },
            )
        }
    }
}

@Composable
private fun HeroAndKpiGrid(
    widgets: List<WidgetDescriptor>,
    currency: String,
    actions: DashboardActions,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        NetPositionCard(
            hero = widgets,
            currency = currency,
            onClick = actions.onOpenDocs,
        )
        // NetPositionCard consumes receivables/payables/thisMonth/openInvoices
        // when both AR + AP are present; otherwise it falls back to the legacy
        // HeroKpiCard render of the first widget and we drop only that widget
        // from the grid (matches the pre-redesign behaviour).
        val consumed = netPositionConsumedIds(widgets)
        val tiles = if (consumed.isEmpty()) {
            widgets.drop(1)
        } else {
            widgets.filter { it.id !in consumed }
        }
        if (tiles.isNotEmpty()) {
            KpiGrid(
                widgets = tiles,
                currency = currency,
                onTileClick = { tile -> actions.dispatchKpiTile(tile.id) },
            )
        }
    }
}
