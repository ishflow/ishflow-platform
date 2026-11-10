package dev.ishflow.android.appshared.models

import dev.ishflow.android.appshared.serializers.BigDecimalSerializer
import dev.ishflow.android.appshared.serializers.InstantIso8601Serializer
import kotlinx.serialization.Serializable
import java.math.BigDecimal
import java.time.Instant

@Serializable
data class RegisterBalanceRow(
    val groupKey: Map<String, String>,
    /**
     * Resolved labels for `groupKey` reference dimensions — only present
     * when the server can dereference the UUIDs (set on `groupBy` queries
     * with `resolveRefLabels`). Empty/absent on plain non-grouped calls.
     */
    val groupLabels: Map<String, String>? = null,
    @Serializable(with = BigDecimalSerializer::class) val quantity: BigDecimal? = null,
    @Serializable(with = BigDecimalSerializer::class) val cost: BigDecimal? = null,
    @Serializable(with = BigDecimalSerializer::class) val revenue: BigDecimal? = null,
)

@Serializable
data class RegisterBalanceResponse(
    val register: String,
    @Serializable(with = InstantIso8601Serializer::class) val asOf: Instant? = null,
    val rows: List<RegisterBalanceRow>,
)
