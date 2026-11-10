package dev.ishflow.android.appshared.models

import dev.ishflow.android.appshared.serializers.BigDecimalSerializer
import dev.ishflow.android.appshared.serializers.InstantIso8601Serializer
import kotlinx.serialization.Serializable
import java.math.BigDecimal
import java.time.Instant

/**
 * A row from any catalog list endpoint (`/api/mobile/catalogs/{entity}`).
 *
 * The optional pricing-related fields are only meaningful for specific
 * entities — customers expose [defaultPriceType] (the resolved reference
 * used to auto-fill sales-wizard line prices; the server returns this as
 * a nested `{id, name}` object, NOT flat `defaultPriceTypeId/Name`),
 * products expose [salePrice] (the canonical fallback when no price-type
 * lookup resolves a value). They default to `null` so existing decoders
 * for other catalogs (warehouses, units, etc.) keep working.
 */
@Serializable
data class CatalogRecord(
    val id: String,
    val code: String? = null,
    val name: String,
    @Serializable(with = InstantIso8601Serializer::class) val createdAt: Instant,
    @Serializable(with = InstantIso8601Serializer::class) val updatedAt: Instant,
    val defaultPriceType: PriceTypeRef? = null,
    @Serializable(with = BigDecimalSerializer::class) val salePrice: BigDecimal? = null,
)

/** Resolved `{id, name}` reference for a price type. Mirrors the server shape. */
@Serializable
data class PriceTypeRef(val id: String, val name: String)

@Serializable
data class CatalogCreateResponse(val id: String, val record: CatalogRecord)

/**
 * Generic create payload for any catalog entity. Only [name] is required;
 * optional fields are sent when non-null. The backend ignores unknown keys,
 * so this covers at minimum the `sales.customer` entity (name + phone + email).
 */
@Serializable
data class CatalogCreateRequest(
    val name: String,
    val phone: String? = null,
    val email: String? = null,
)

/**
 * Create payload for `inventory.product`. Only [name] is required;
 * [unit], [basePrice] (decimal string), and [barcode] are optional.
 */
@Serializable
data class CatalogCreateProductRequest(
    val name: String,
    val unit: String? = null,
    val basePrice: String? = null,
    val barcode: String? = null,
)

typealias CatalogListResponse = PaginatedResponse<CatalogRecord>
