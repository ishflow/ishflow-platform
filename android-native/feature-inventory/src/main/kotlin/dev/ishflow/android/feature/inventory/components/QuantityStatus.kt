package dev.ishflow.android.feature.inventory.components

import java.math.BigDecimal

/**
 * Stock quantity bucket used by [QuantityPill] and [StockRow] to colour-code
 * inventory rows. Thresholds (see [toQuantityStatus]) live in this single
 * place so the UI and tests never duplicate the magic numbers.
 */
enum class QuantityStatus {
    /** quantity >= 10 — surfaceVariant pill. */
    Normal,

    /** 0 < quantity < 10 — errorContainer pill, low-stock warning icon. */
    Low,

    /** quantity == 0 — error pill, out-of-stock warning icon. */
    OutOfStock,
}

/**
 * Single source of truth for the inventory quantity → status mapping.
 *
 * Uses [BigDecimal.compareTo] (not [BigDecimal.equals]) so values that
 * differ only in scale (`0` vs `0.00`) still collapse to [QuantityStatus.OutOfStock].
 */
fun BigDecimal.toQuantityStatus(): QuantityStatus = when {
    compareTo(BigDecimal.ZERO) == 0 -> QuantityStatus.OutOfStock
    compareTo(BigDecimal.TEN) >= 0 -> QuantityStatus.Normal
    else -> QuantityStatus.Low
}
