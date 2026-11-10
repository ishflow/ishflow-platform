package dev.ishflow.android.feature.dashboard.layouts

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import dev.ishflow.android.R
import dev.ishflow.android.appshared.models.WidgetDescriptor
import dev.ishflow.android.feature.dashboard.DashboardActions
import dev.ishflow.android.feature.dashboard.DashboardLayoutBundle
import dev.ishflow.android.feature.dashboard.dispatchActionTarget
import dev.ishflow.android.feature.dashboard.dispatchKpiTile
import dev.ishflow.android.feature.dashboard.kpiCount
import dev.ishflow.android.feature.dashboard.listItems
import dev.ishflow.android.feature.dashboard.widgets.ActionTarget
import dev.ishflow.android.feature.dashboard.widgets.toKpiMeta

private val PASTEL_CARD_HEIGHT = 140.dp
private val PASTEL_CELL_MIN = 180.dp

/**
 * Pastel Bento layout — the same widgets [HeroLayout] renders, but laid out
 * as an adaptive bento grid of equal-size pastel tiles. The container
 * backgrounds cycle through three Material 3 tonal containers
 * (`tertiaryContainer`, `secondaryContainer`, `surfaceVariant`) so the
 * surface stays calm in both light and dark mode without raw colors.
 */
@Composable
internal fun PastelBentoLayout(
    bundle: DashboardLayoutBundle,
    actions: DashboardActions,
) {
    val tiles = remember(bundle) { buildPastelTiles(bundle) }
    LazyVerticalGrid(
        columns = GridCells.Adaptive(PASTEL_CELL_MIN),
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        items(tiles) { tile ->
            BentoCard(tile = tile, currency = bundle.currency, actions = actions)
        }
    }
}

/**
 * A single bento entry — either a KPI widget or an action-queue summary.
 * Keeping both shapes in one sealed type lets the grid iterate uniformly.
 */
private sealed interface BentoTile {
    val widget: WidgetDescriptor
    val backgroundTone: PastelTone

    data class Kpi(
        override val widget: WidgetDescriptor,
        override val backgroundTone: PastelTone,
    ) : BentoTile

    data class Action(
        override val widget: WidgetDescriptor,
        override val backgroundTone: PastelTone,
        val target: ActionTarget,
        val count: Int,
    ) : BentoTile
}

private enum class PastelTone { Tertiary, Secondary, Variant }

private fun buildPastelTiles(bundle: DashboardLayoutBundle): List<BentoTile> {
    val tones = arrayOf(PastelTone.Tertiary, PastelTone.Secondary, PastelTone.Variant)
    val kpis: List<BentoTile> = bundle.hero.map { widget ->
        BentoTile.Kpi(widget = widget, backgroundTone = PastelTone.Tertiary)
    }
    val actionsTiles: List<BentoTile> = bundle.actions.mapNotNull { widget ->
        val decomp = widget.toActionDecomp() ?: return@mapNotNull null
        BentoTile.Action(
            widget = widget,
            backgroundTone = PastelTone.Tertiary,
            target = decomp.target,
            count = decomp.count,
        )
    }
    return (kpis + actionsTiles).mapIndexed { index, tile ->
        val tone = tones[index % tones.size]
        when (tile) {
            is BentoTile.Kpi -> tile.copy(backgroundTone = tone)
            is BentoTile.Action -> tile.copy(backgroundTone = tone)
        }
    }
}

private data class ActionDecomp(val target: ActionTarget, val count: Int)

private fun WidgetDescriptor.toActionDecomp(): ActionDecomp? = when (id) {
    "action.upcomingReceivables" -> {
        val n = listItems.size
        if (n > 0) ActionDecomp(ActionTarget.OverdueReceivables, n) else null
    }
    "action.lowStock" -> {
        val n = kpiCount ?: 0
        if (n > 0) ActionDecomp(ActionTarget.LowStock, n) else null
    }
    "action.unposted" -> {
        val n = kpiCount ?: 0
        if (n > 0) ActionDecomp(ActionTarget.Unposted, n) else null
    }
    "action.upcomingPayables" -> {
        val n = listItems.size
        if (n > 0) ActionDecomp(ActionTarget.UpcomingPayables, n) else null
    }
    else -> null
}

@Composable
private fun BentoCard(
    tile: BentoTile,
    currency: String,
    actions: DashboardActions,
) {
    val (background, content) = tonePair(tile.backgroundTone)
    val onClick: () -> Unit = when (tile) {
        is BentoTile.Kpi -> ({ actions.dispatchKpiTile(tile.widget.id) })
        is BentoTile.Action -> ({ actions.dispatchActionTarget(tile.target) })
    }
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().height(PASTEL_CARD_HEIGHT),
        colors = CardDefaults.cardColors(containerColor = background, contentColor = content),
    ) {
        when (tile) {
            is BentoTile.Kpi -> BentoKpiContent(widget = tile.widget, currency = currency)
            is BentoTile.Action -> BentoActionContent(tile = tile)
        }
    }
}

@Composable
private fun BentoKpiContent(widget: WidgetDescriptor, currency: String) {
    val meta = widget.toKpiMeta(currency)
    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(meta.icon, contentDescription = null, modifier = Modifier.size(18.dp))
            Text(
                text = stringResource(meta.labelRes),
                style = MaterialTheme.typography.labelMedium,
                modifier = Modifier.padding(start = 8.dp),
                maxLines = 2,
            )
        }
        Text(
            text = meta.value,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            maxLines = 2,
        )
    }
}

@Composable
private fun BentoActionContent(tile: BentoTile.Action) {
    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                modifier = Modifier.size(18.dp),
            )
            Text(
                text = stringResource(actionLabelRes(tile.target)),
                style = MaterialTheme.typography.labelMedium,
                modifier = Modifier.padding(start = 8.dp),
                maxLines = 2,
            )
        }
        Text(
            text = tile.count.toString(),
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
        )
    }
}

private fun actionLabelRes(target: ActionTarget): Int = when (target) {
    ActionTarget.OverdueReceivables -> R.string.dashboard_action_overdue_title
    ActionTarget.LowStock -> R.string.dashboard_action_low_stock_title
    ActionTarget.Unposted -> R.string.dashboard_action_unposted_title
    ActionTarget.UpcomingPayables -> R.string.dashboard_action_upcoming_payables_title
}

@Composable
private fun tonePair(tone: PastelTone): Pair<Color, Color> = when (tone) {
    // Brand has no tertiary token — fall back to the primary-container
    // family (soft blue tint) so dashboard tiles stay on the ishflow blue
    // palette instead of leaking Material's default lavender/pink.
    PastelTone.Tertiary -> MaterialTheme.colorScheme.primaryContainer to
        MaterialTheme.colorScheme.onPrimaryContainer
    PastelTone.Secondary -> MaterialTheme.colorScheme.secondaryContainer to
        MaterialTheme.colorScheme.onSecondaryContainer
    PastelTone.Variant -> MaterialTheme.colorScheme.surfaceVariant to
        MaterialTheme.colorScheme.onSurfaceVariant
}
