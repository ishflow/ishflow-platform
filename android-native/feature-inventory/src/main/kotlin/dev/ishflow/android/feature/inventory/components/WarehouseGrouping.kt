package dev.ishflow.android.feature.inventory.components

import dev.ishflow.android.feature.inventory.InventoryItem

/**
 * Deterministic warehouse → items grouping used by `InventoryListScreen`.
 * Sorted by warehouse name so the rendered card order is stable across
 * recompositions. Extracted as a pure function so it can be unit-tested
 * without the Compose runtime.
 */
fun groupByWarehouse(items: List<InventoryItem>): List<Pair<String, List<InventoryItem>>> =
    items.groupBy { it.warehouse }
        .toSortedMap()
        .map { (warehouse, rows) -> warehouse to rows }
