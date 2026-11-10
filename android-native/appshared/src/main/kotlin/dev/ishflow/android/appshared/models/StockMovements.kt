package dev.ishflow.android.appshared.models

import kotlinx.serialization.Serializable

@Serializable
data class StockMovementsResponse(
    val movements: List<StockMovement>,
)

/**
 * A single posting row from `movement_inventory_stock_balance`.
 *
 * [direction] is `"in"` for stock received (purchases.invoice) and `"out"` for
 * stock shipped (sales.invoice). [qty] is always a positive decimal string.
 */
@Serializable
data class StockMovement(
    val date: String,
    val docKind: String,
    val docId: String,
    val docNumber: String,
    val qty: String,
    val direction: String,
    val warehouse: String,
)
