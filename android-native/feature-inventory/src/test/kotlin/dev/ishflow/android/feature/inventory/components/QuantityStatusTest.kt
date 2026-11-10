package dev.ishflow.android.feature.inventory.components

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import java.math.BigDecimal

class QuantityStatusTest {

    @Test
    fun `zero maps to OutOfStock`() {
        assertEquals(QuantityStatus.OutOfStock, BigDecimal.ZERO.toQuantityStatus())
    }

    @Test
    fun `zero with scale still maps to OutOfStock`() {
        // 0.00 vs 0 — compareTo collapses scale; equals would not.
        assertEquals(QuantityStatus.OutOfStock, BigDecimal("0.00").toQuantityStatus())
    }

    @Test
    fun `tiny positive maps to Low`() {
        assertEquals(QuantityStatus.Low, BigDecimal("0.5").toQuantityStatus())
    }

    @Test
    fun `just below threshold maps to Low`() {
        assertEquals(QuantityStatus.Low, BigDecimal("9.99").toQuantityStatus())
    }

    @Test
    fun `exactly ten maps to Normal`() {
        assertEquals(QuantityStatus.Normal, BigDecimal.TEN.toQuantityStatus())
    }

    @Test
    fun `large value maps to Normal`() {
        assertEquals(QuantityStatus.Normal, BigDecimal("100").toQuantityStatus())
    }
}
