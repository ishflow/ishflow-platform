package dev.ishflow.android.feature.inventory.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import dev.ishflow.android.feature.inventory.InventoryItem

/**
 * Single product row inside a [WarehouseSectionCard]. Renders a leading
 * status icon (📦 normal, ⚠️ low/out-of-stock), the product name, and a
 * trailing [QuantityPill]. Tapping the row drills into the product detail.
 */
@Composable
fun StockRow(
    item: InventoryItem,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val status = item.quantity.toQuantityStatus()
    val leadingIcon = when (status) {
        QuantityStatus.Normal -> Icons.Filled.Inventory2
        QuantityStatus.Low, QuantityStatus.OutOfStock -> Icons.Filled.WarningAmber
    }
    val leadingTint = when (status) {
        QuantityStatus.Normal -> MaterialTheme.colorScheme.onSurfaceVariant
        QuantityStatus.Low -> MaterialTheme.colorScheme.error
        QuantityStatus.OutOfStock -> MaterialTheme.colorScheme.error
    }
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Start,
    ) {
        Icon(
            imageVector = leadingIcon,
            contentDescription = null,
            tint = leadingTint,
            modifier = Modifier.size(20.dp),
        )
        Spacer(Modifier.width(12.dp))
        Text(
            text = item.productName,
            style = MaterialTheme.typography.titleSmall,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
        )
        Spacer(Modifier.width(12.dp))
        QuantityPill(value = item.quantity.toPlainString(), status = status)
    }
}
