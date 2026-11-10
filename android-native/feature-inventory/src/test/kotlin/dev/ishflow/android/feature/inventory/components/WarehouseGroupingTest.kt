package dev.ishflow.android.feature.inventory.components

import dev.ishflow.android.feature.inventory.InventoryItem
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.math.BigDecimal

class WarehouseGroupingTest {

    @Test
    fun `empty list returns empty grouping`() {
        assertTrue(groupByWarehouse(emptyList()).isEmpty())
    }

    @Test
    fun `single warehouse produces single entry with all items`() {
        val items = listOf(
            item("p1", "Apple", "Main", "3"),
            item("p2", "Pear", "Main", "10"),
        )
        val result = groupByWarehouse(items)
        assertEquals(1, result.size)
        val (warehouse, rows) = result.single()
        assertEquals("Main", warehouse)
        assertEquals(2, rows.size)
        assertEquals(listOf("Apple", "Pear"), rows.map { it.productName })
    }

    @Test
    fun `multiple warehouses are sorted by name`() {
        val items = listOf(
            item("p1", "Apple", "Zeta", "3"),
            item("p2", "Pear", "Alpha", "10"),
            item("p3", "Plum", "Mu", "5"),
            item("p4", "Lemon", "Alpha", "0"),
        )
        val result = groupByWarehouse(items)
        assertEquals(listOf("Alpha", "Mu", "Zeta"), result.map { it.first })
        // Alpha should contain Pear + Lemon (insertion order preserved by groupBy).
        val alpha = result.first { it.first == "Alpha" }.second
        assertEquals(listOf("Pear", "Lemon"), alpha.map { it.productName })
        // Mu has one row.
        val mu = result.first { it.first == "Mu" }.second
        assertEquals(listOf("Plum"), mu.map { it.productName })
        // Zeta has one row.
        val zeta = result.first { it.first == "Zeta" }.second
        assertEquals(listOf("Apple"), zeta.map { it.productName })
    }

    private fun item(id: String, name: String, warehouse: String, quantity: String) = InventoryItem(
        productId = id,
        productName = name,
        warehouse = warehouse,
        quantity = BigDecimal(quantity),
    )
}
