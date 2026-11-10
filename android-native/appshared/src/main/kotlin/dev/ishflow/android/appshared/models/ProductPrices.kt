package dev.ishflow.android.appshared.models

import dev.ishflow.android.appshared.serializers.BigDecimalSerializer
import kotlinx.serialization.Serializable
import java.math.BigDecimal

/**
 * One resolved price item for a product, scoped to a price type.
 *
 * Returned by `/api/mobile/products/{id}/prices` (server route:
 * `app/api/mobile/products/[id]/prices/route.ts`). The server already applies the
 * dynamic-no-base `liveCost` fallback (iOS PR #80 backend fix) when resolving
 * each item, so the client does not need to derive any cost on its own — it
 * just consumes [value].
 *
 * `value` is wire-encoded as a decimal string (e.g. `"1980.00"`) to avoid JSON
 * precision loss; deserialize via [BigDecimalSerializer].
 */
@Serializable
data class ProductPriceItem(
    val priceTypeId: String,
    val priceTypeName: String,
    val kind: String,
    val isDefault: Boolean,
    @Serializable(with = BigDecimalSerializer::class) val value: BigDecimal,
)

@Serializable
data class ProductPricesResponse(val items: List<ProductPriceItem>)
