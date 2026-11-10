package dev.ishflow.android.feature.inventory.filter

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Category
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.automirrored.filled.TrendingDown
import androidx.compose.material.icons.filled.Warehouse
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import dev.ishflow.android.feature.inventory.R

/**
 * Horizontally scrolling chip row mirroring the iOS
 * `InventoryFilterChipRow`. Each AssistChip opens its scoped picker (or the
 * shared advanced sheet) and renders an active-count suffix when its
 * dimension is non-empty. The low-stock toggle is the lone FilterChip
 * because it has only an on/off state and no separate picker.
 */
@Composable
fun InventoryFilterChipRow(
    filter: InventoryFilterState,
    onCategoryClick: () -> Unit,
    onGroupClick: () -> Unit,
    onWarehouseClick: () -> Unit,
    onLowStockToggle: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        AssistChip(
            onClick = onCategoryClick,
            label = {
                Text(chipLabel(stringResource(R.string.inventory_filter_category), filter.categoryIds.size))
            },
            leadingIcon = {
                Icon(
                    Icons.Filled.Category,
                    contentDescription = null,
                    modifier = Modifier.size(AssistChipDefaults.IconSize),
                )
            },
        )
        AssistChip(
            onClick = onGroupClick,
            label = {
                Text(chipLabel(stringResource(R.string.inventory_filter_group), filter.groupIds.size))
            },
            leadingIcon = {
                Icon(
                    Icons.Filled.Folder,
                    contentDescription = null,
                    modifier = Modifier.size(AssistChipDefaults.IconSize),
                )
            },
        )
        AssistChip(
            onClick = onWarehouseClick,
            label = {
                Text(chipLabel(stringResource(R.string.inventory_filter_warehouse), filter.warehouseIds.size))
            },
            leadingIcon = {
                Icon(
                    Icons.Filled.Warehouse,
                    contentDescription = null,
                    modifier = Modifier.size(AssistChipDefaults.IconSize),
                )
            },
        )
        FilterChip(
            selected = filter.lowStockOnly,
            onClick = onLowStockToggle,
            label = { Text(stringResource(R.string.inventory_filter_low_stock)) },
            leadingIcon = if (filter.lowStockOnly) {
                {
                    Icon(
                        Icons.AutoMirrored.Filled.TrendingDown,
                        contentDescription = null,
                        modifier = Modifier.size(AssistChipDefaults.IconSize),
                    )
                }
            } else {
                null
            },
        )
    }
}

private fun chipLabel(base: String, count: Int): String =
    if (count > 0) "$base ($count)" else base
