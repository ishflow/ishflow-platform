package dev.ishflow.android.feature.inventory.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.HorizontalDivider
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import dev.ishflow.android.feature.inventory.InventoryItem

/**
 * Per-warehouse card. Header row toggles the expanded state; when expanded
 * the card reveals one [StockRow] per item. Default outer spacing is 4dp
 * vertical / 0dp horizontal so a stack of cards inside a LazyColumn breathes
 * without an extra wrapper.
 */
@Composable
fun WarehouseSectionCard(
    warehouseName: String,
    items: List<InventoryItem>,
    expanded: Boolean,
    onToggle: () -> Unit,
    onItemClick: (InventoryItem) -> Unit,
    modifier: Modifier = Modifier,
) {
    ElevatedCard(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        shape = RoundedCornerShape(12.dp),
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            WarehouseHeaderRow(
                warehouseName = warehouseName,
                itemCount = items.size,
                expanded = expanded,
                onClick = onToggle,
            )
            if (expanded) {
                HorizontalDivider()
                items.forEach { item ->
                    StockRow(item = item, onClick = { onItemClick(item) })
                }
            }
        }
    }
}
