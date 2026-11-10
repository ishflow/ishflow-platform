package dev.ishflow.android.appshared.models

import dev.ishflow.android.appshared.serializers.BigDecimalSerializer
import dev.ishflow.android.appshared.serializers.InstantIso8601Serializer
import kotlinx.serialization.Serializable
import java.math.BigDecimal
import java.time.Instant

// ---------------------------------------------------------------------------
// Sales summary
// ---------------------------------------------------------------------------

@Serializable
data class ReportPeriod(
    @Serializable(with = InstantIso8601Serializer::class) val from: Instant,
    @Serializable(with = InstantIso8601Serializer::class) val to: Instant,
)

@Serializable
data class SalesSummaryCustomerRow(
    val customerId: String,
    val customerName: String,
    @Serializable(with = BigDecimalSerializer::class) val total: BigDecimal,
    val count: Int,
)

@Serializable
data class SalesSummaryProductRow(
    val productId: String,
    val productName: String,
    @Serializable(with = BigDecimalSerializer::class) val qty: BigDecimal,
    @Serializable(with = BigDecimalSerializer::class) val revenue: BigDecimal,
)

@Serializable
data class SalesSummary(
    val period: ReportPeriod,
    @Serializable(with = BigDecimalSerializer::class) val totalRevenue: BigDecimal,
    val invoiceCount: Int,
    val byCustomer: List<SalesSummaryCustomerRow>,
    val byProduct: List<SalesSummaryProductRow>,
)

// ---------------------------------------------------------------------------
// A/R aging
// ---------------------------------------------------------------------------

@Serializable
@Suppress("EnumNaming")
enum class ArAgingBucketLabel {
    @kotlinx.serialization.SerialName("0-30") ZERO_TO_30,
    @kotlinx.serialization.SerialName("31-60") THIRTY_ONE_TO_60,
    @kotlinx.serialization.SerialName("61-90") SIXTY_ONE_TO_90,
    @kotlinx.serialization.SerialName("90+") NINETY_PLUS,
}

@Serializable
data class ArAgingBucketRow(
    val label: ArAgingBucketLabel,
    @Serializable(with = BigDecimalSerializer::class) val total: BigDecimal,
    val count: Int,
)

@Serializable
data class ArAgingCustomerRow(
    val customerId: String,
    val customerName: String,
    @Serializable(with = BigDecimalSerializer::class) val total: BigDecimal,
    val oldestDays: Int,
)

@Serializable
data class ArAging(
    @Serializable(with = InstantIso8601Serializer::class) val asOf: Instant,
    val buckets: List<ArAgingBucketRow>,
    val byCustomer: List<ArAgingCustomerRow>,
)

// ---------------------------------------------------------------------------
// Gross profit
// ---------------------------------------------------------------------------

@Serializable
data class GrossProfitProductRow(
    val productId: String,
    val productName: String,
    @Serializable(with = BigDecimalSerializer::class) val revenue: BigDecimal,
    @Serializable(with = BigDecimalSerializer::class) val cogs: BigDecimal,
    @Serializable(with = BigDecimalSerializer::class) val profit: BigDecimal,
    @Serializable(with = BigDecimalSerializer::class) val marginPct: BigDecimal,
)

@Serializable
data class GrossProfit(
    val period: ReportPeriod,
    @Serializable(with = BigDecimalSerializer::class) val revenue: BigDecimal,
    @Serializable(with = BigDecimalSerializer::class) val cogs: BigDecimal,
    @Serializable(with = BigDecimalSerializer::class) val grossProfit: BigDecimal,
    @Serializable(with = BigDecimalSerializer::class) val marginPct: BigDecimal,
    val byProduct: List<GrossProfitProductRow>,
)
