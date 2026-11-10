package dev.ishflow.android.appshared.models

import dev.ishflow.android.appshared.serializers.NumericBigDecimalSerializer
import kotlinx.serialization.Serializable
import java.math.BigDecimal

/**
 * Weekly balance trend point. `weekStart` is an ISO `YYYY-MM-DD` Monday date
 * (server emits whole-week buckets so the sparkline keeps a steady 13-point
 * shape even when activity is sparse). `balance` is the running A/R or A/P
 * balance at the end of that week.
 */
@Serializable
data class BalanceTrendPoint(
    val weekStart: String,
    @Serializable(with = NumericBigDecimalSerializer::class) val balance: BigDecimal,
)

/**
 * Invoice summary card inside Customer 360. For customers this is a
 * `sales.invoice`; for suppliers a `purchases.invoice`. `total` is the
 * sum of line totals computed server-side (the document table itself
 * doesn't carry a denormalized total).
 */
@Serializable
data class Customer360Invoice(
    val id: String,
    val number: String,
    val date: String,
    val status: String,
    val postedAt: String? = null,
    @Serializable(with = NumericBigDecimalSerializer::class) val total: BigDecimal,
)

/**
 * Payment summary card inside Customer 360. For customers this is a
 * `sales.payment_received`; for suppliers a `purchases.payment_sent`.
 */
@Serializable
data class Customer360Payment(
    val id: String,
    val number: String,
    val date: String,
    @Serializable(with = NumericBigDecimalSerializer::class) val amount: BigDecimal,
    val status: String,
    val postedAt: String? = null,
)

/**
 * Stock-out placeholder. The 360 endpoint returns an empty list here; the
 * richer per-product aggregate is carried in [Customer360Response.productMovements].
 * Kept on the wire for backward compatibility.
 */
@Serializable
data class Customer360StockOut(
    val id: String,
)

/**
 * Aggregated product movement summary inside Customer / Supplier 360.
 *
 * For customers: products they purchased (from sales invoice lines).
 * For suppliers: products they supplied (from purchase invoice lines).
 *
 * [totalQty] is a decimal string to avoid precision loss. [lastDate] is
 * `YYYY-MM-DD` or null when no dated line is found.
 */
@Serializable
data class ProductMovementSummary(
    val productName: String,
    val totalQty: String,
    val lastDate: String? = null,
)

/**
 * Counterparty identity subset returned inside the 360 payload. Shape is
 * identical for customers and suppliers; supplier responses simply leave
 * `code` and `address` null.
 */
@Serializable
data class Customer360Party(
    val id: String,
    val code: String? = null,
    val name: String,
    val phone: String? = null,
    val email: String? = null,
    val address: String? = null,
)

/**
 * A single note entry on a counterparty (read-only; notes are edited via the
 * web platform). [author] is null when the note was created by the system.
 */
@Serializable
data class NoteEntry(
    val text: String,
    val createdAt: String,
    val author: String? = null,
)

/**
 * Aggregated Customer / Supplier 360 payload returned by
 * `/api/mobile/counterparty-360/{id}?type=customer|supplier`. Wire fields
 * mirror the iOS `Customer360Response` shape — keep them in sync when the
 * server contract changes.
 */
@Serializable
data class Customer360Response(
    val type: CounterpartyType,
    val counterparty: Customer360Party,
    @Serializable(with = NumericBigDecimalSerializer::class) val balance: BigDecimal,
    val currency: String,
    val balanceTrend: List<BalanceTrendPoint> = emptyList(),
    val invoices: List<Customer360Invoice> = emptyList(),
    val payments: List<Customer360Payment> = emptyList(),
    val stockOuts: List<Customer360StockOut> = emptyList(),
    val productMovements: List<ProductMovementSummary> = emptyList(),
    val notes: List<NoteEntry> = emptyList(),
)
