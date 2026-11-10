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
import dev.ishflow.android.appshared.models.WidgetDescriptor

private const val HERO_DELTA_ZERO = 0.0

/**
 * Full-width hero KPI card — the role-aware "most important number" at the
 * top of the dashboard. Renders the localized label, the formatted value,
 * and a green/red delta vs the comparison window when the server emitted
 * one. Tap is wired through [onClick] so the host can deep-link.
 */
@Composable
internal fun HeroKpiCard(
    widget: WidgetDescriptor,
    currency: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val meta = widget.toKpiMeta(currency)
    Card(
        onClick = onClick,
        modifier = modifier.fillMaxWidth(),
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
                points = meta.sparkline,
                deltaPct = meta.deltaPct,
                modifier = Modifier.padding(top = 12.dp),
            )
            if (meta.deltaPct != HERO_DELTA_ZERO) {
                HeroDeltaRow(deltaPct = meta.deltaPct, comparisonLabelRes = meta.deltaLabelRes)
            }
        }
    }
}

@Composable
private fun HeroDeltaRow(deltaPct: Double, comparisonLabelRes: Int) {
    val isUp = deltaPct > 0
    val color = if (isUp) Color(0xFF2E7D32) else Color(0xFFC62828)
    val arrow = if (isUp) Icons.Filled.ArrowUpward else Icons.Filled.ArrowDownward
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        modifier = Modifier.padding(top = 10.dp),
    ) {
        Icon(imageVector = arrow, contentDescription = null, modifier = Modifier.size(16.dp), tint = color)
        Text(
            text = "${deltaPct.toInt()}% ${stringResource(comparisonLabelRes)}",
            style = MaterialTheme.typography.labelLarge,
            color = color,
        )
    }
}
