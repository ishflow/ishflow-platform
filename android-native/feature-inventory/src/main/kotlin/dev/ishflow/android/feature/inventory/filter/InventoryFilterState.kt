package dev.ishflow.android.feature.inventory.filter

/**
 * Snapshot of the inventory list's filter state. Mirrors the iOS reference
 * (`InventoryFilterState`): three multi-select reference dimensions plus a
 * single low-stock toggle.
 *
 * Category and group are kept on the model for iOS parity even though the
 * current Android server payload (`/api/mobile/registers/inventory.stock/balance`
 * with `groupBy=product,warehouse`) does not expose those dimensions; the
 * sheet renders empty pickers for them until the API surfaces them.
 */
data class InventoryFilterState(
    val categoryIds: Set<String> = emptySet(),
    val groupIds: Set<String> = emptySet(),
    val warehouseIds: Set<String> = emptySet(),
    val lowStockOnly: Boolean = false,
) {
    val activeCount: Int
        get() = listOf(
            categoryIds.isNotEmpty(),
            groupIds.isNotEmpty(),
            warehouseIds.isNotEmpty(),
            lowStockOnly,
        ).count { it }

    val isActive: Boolean
        get() = activeCount > 0

    fun cleared(): InventoryFilterState = InventoryFilterState()
}
