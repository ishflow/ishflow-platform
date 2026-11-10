package dev.ishflow.android.feature.dashboard.widgets

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import dev.ishflow.android.appshared.models.WidgetDescriptor

private const val GRID_COLUMNS = 2
private val TILE_GAP = 12.dp

/**
 * 2-column responsive grid of secondary KPI tiles. The first widget feeds
 * the hero card so this composable always renders `widgets.drop(1).take(4)`
 * — render in row pairs to keep parity with iOS's 2x2 [LazyVGrid].
 */
@Composable
internal fun KpiGrid(
    widgets: List<WidgetDescriptor>,
    currency: String,
    onTileClick: (WidgetDescriptor) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (widgets.isEmpty()) return
    val tiles = widgets.take(GRID_COLUMNS * GRID_COLUMNS)
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(TILE_GAP)) {
        tiles.chunked(GRID_COLUMNS).forEach { rowTiles ->
            Row(horizontalArrangement = Arrangement.spacedBy(TILE_GAP)) {
                rowTiles.forEach { tile ->
                    KpiTile(
                        widget = tile,
                        currency = currency,
                        onClick = { onTileClick(tile) },
                        modifier = Modifier.weight(1f),
                    )
                }
                if (rowTiles.size < GRID_COLUMNS) {
                    repeat(GRID_COLUMNS - rowTiles.size) { Spacer(modifier = Modifier.weight(1f)) }
                }
            }
        }
    }
}

@Composable
private fun KpiTile(
    widget: WidgetDescriptor,
    currency: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val meta = widget.toKpiMeta(currency)
    Card(
        onClick = onClick,
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh),
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(meta.icon, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = stringResource(meta.labelRes),
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                )
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = meta.value,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
            )
        }
    }
}
