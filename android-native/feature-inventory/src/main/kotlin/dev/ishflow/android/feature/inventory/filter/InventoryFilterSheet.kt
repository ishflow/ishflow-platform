package dev.ishflow.android.feature.inventory.filter

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import dev.ishflow.android.feature.inventory.R

/**
 * Reference option rendered inside a picker section. `id` is the canonical
 * key persisted into [InventoryFilterState]; `label` is the user-visible
 * string.
 */
data class FilterOption(val id: String, val label: String)

/**
 * Advanced filter sheet mirroring iOS `InventoryAdvancedFilterSheet`. A
 * single ModalBottomSheet holds the low-stock toggle on top, three
 * collapsible reference pickers (Category / Group / Warehouse) with
 * checkbox multi-select rows, and Apply / Clear buttons pinned to the
 * bottom. Edits live in a local draft until Apply commits them — this is
 * what lets users tinker without firing a refresh on every toggle.
 *
 * Empty option lists render a muted hint row so the section still feels
 * "present" instead of disappearing — useful while the server hasn't
 * surfaced category / group dimensions for the inventory register.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
@Suppress("LongMethod")
fun InventoryFilterSheet(
    initial: InventoryFilterState,
    categoryOptions: List<FilterOption>,
    groupOptions: List<FilterOption>,
    warehouseOptions: List<FilterOption>,
    onApply: (InventoryFilterState) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var draft by remember { mutableStateOf(initial) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        modifier = modifier,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState()),
        ) {
            Text(
                text = stringResource(R.string.inventory_filter_title),
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.padding(vertical = 12.dp),
            )

            ListItem(
                headlineContent = { Text(stringResource(R.string.inventory_filter_low_stock)) },
                trailingContent = {
                    Switch(
                        checked = draft.lowStockOnly,
                        onCheckedChange = { draft = draft.copy(lowStockOnly = it) },
                    )
                },
                colors = ListItemDefaults.colors(containerColor = MaterialTheme.colorScheme.surface),
            )

            HorizontalDivider()

            FilterSection(
                title = stringResource(R.string.inventory_filter_category),
                options = categoryOptions,
                selected = draft.categoryIds,
                onToggle = { id ->
                    draft = draft.copy(categoryIds = draft.categoryIds.toggle(id))
                },
            )

            HorizontalDivider()

            FilterSection(
                title = stringResource(R.string.inventory_filter_group),
                options = groupOptions,
                selected = draft.groupIds,
                onToggle = { id ->
                    draft = draft.copy(groupIds = draft.groupIds.toggle(id))
                },
            )

            HorizontalDivider()

            FilterSection(
                title = stringResource(R.string.inventory_filter_warehouse),
                options = warehouseOptions,
                selected = draft.warehouseIds,
                onToggle = { id ->
                    draft = draft.copy(warehouseIds = draft.warehouseIds.toggle(id))
                },
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp, bottom = 24.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                OutlinedButton(
                    onClick = { draft = draft.cleared() },
                    modifier = Modifier.weight(1f),
                    enabled = draft.isActive,
                ) {
                    Text(stringResource(R.string.inventory_filter_clear))
                }
                Button(
                    onClick = {
                        onApply(draft)
                        onDismiss()
                    },
                    modifier = Modifier.weight(1f),
                ) {
                    Text(stringResource(R.string.inventory_filter_apply))
                }
            }
        }
    }
}

@Composable
private fun FilterSection(
    title: String,
    options: List<FilterOption>,
    selected: Set<String>,
    onToggle: (String) -> Unit,
) {
    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.padding(vertical = 8.dp),
        )
        if (options.isEmpty()) {
            Text(
                text = stringResource(R.string.inventory_filter_empty),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(vertical = 8.dp),
            )
        } else {
            options.forEach { option ->
                val isChecked = option.id in selected
                ListItem(
                    headlineContent = { Text(option.label) },
                    leadingContent = {
                        Checkbox(
                            checked = isChecked,
                            onCheckedChange = { onToggle(option.id) },
                        )
                    },
                    colors = ListItemDefaults.colors(containerColor = MaterialTheme.colorScheme.surface),
                )
            }
        }
    }
}

private fun Set<String>.toggle(id: String): Set<String> =
    if (id in this) this - id else this + id
