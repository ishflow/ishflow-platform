package dev.ishflow.android.appshared.models

import kotlinx.serialization.Serializable

/**
 * Mirror of `StockBatchResponseSchema` from `@ishflow/mobile-api-contract`.
 *
 * `GET /api/mobile/inventory/stock?productIds=<csv>` returns, for each
 * requested product, the warehouses that currently hold positive stock.
 * Server route: `app/api/mobile/inventory/stock/route.ts`. Capped at 100
 * productIds per request.
 */
@Serializable
data class StockBatchResponse(val items: List<StockBatchItem>)

@Serializable
data class StockBatchItem(
    val productId: String,
    val byWarehouse: List<StockBatchWarehouseEntry>,
)

@Serializable
data class StockBatchWarehouseEntry(
    val warehouseId: String,
    val warehouseName: String,
    val qty: String,
)
