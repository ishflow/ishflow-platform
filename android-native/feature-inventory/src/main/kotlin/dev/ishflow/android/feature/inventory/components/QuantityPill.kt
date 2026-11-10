package dev.ishflow.android.feature.inventory.components

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import dev.ishflow.android.feature.inventory.R

/**
 * Rounded badge that renders a stock quantity with a colour matching its
 * [QuantityStatus]. The container colour comes from the Material 3 colour
 * scheme so the pill adapts to light/dark themes automatically.
 *
 * - [QuantityStatus.Normal]: `surfaceVariant` / `onSurfaceVariant`
 * - [QuantityStatus.Low]: `errorContainer` / `onErrorContainer`
 * - [QuantityStatus.OutOfStock]: `error` / white (per spec — white text on red)
 */
@Composable
fun QuantityPill(
    value: String,
    status: QuantityStatus,
    modifier: Modifier = Modifier,
) {
    val containerColor = when (status) {
        QuantityStatus.Normal -> MaterialTheme.colorScheme.surfaceVariant
        QuantityStatus.Low -> MaterialTheme.colorScheme.errorContainer
        QuantityStatus.OutOfStock -> MaterialTheme.colorScheme.error
    }
    val contentColor = when (status) {
        QuantityStatus.Normal -> MaterialTheme.colorScheme.onSurfaceVariant
        QuantityStatus.Low -> MaterialTheme.colorScheme.onErrorContainer
        QuantityStatus.OutOfStock -> Color.White
    }
    val badgeLabel = when (status) {
        QuantityStatus.Low -> stringResource(R.string.inventory_low_stock_badge)
        QuantityStatus.OutOfStock -> stringResource(R.string.inventory_out_of_stock_badge)
        QuantityStatus.Normal -> null
    }
    val accessibilityModifier = if (badgeLabel != null) {
        Modifier.semantics { contentDescription = "$badgeLabel $value" }
    } else {
        Modifier
    }
    Surface(
        modifier = modifier.then(accessibilityModifier),
        shape = MaterialTheme.shapes.small,
        color = containerColor,
        contentColor = contentColor,
    ) {
        Text(
            text = value,
            style = MaterialTheme.typography.labelMedium,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
        )
    }
}
