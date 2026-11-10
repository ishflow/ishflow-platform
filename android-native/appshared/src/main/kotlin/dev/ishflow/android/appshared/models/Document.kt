package dev.ishflow.android.appshared.models

import dev.ishflow.android.appshared.serializers.InstantIso8601Serializer
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.time.Instant

@Serializable
enum class DocumentStatus { DRAFT, SAVED, POSTED, CANCELLED }

@Serializable(with = dev.ishflow.android.appshared.serializers.PartyRefSerializer::class)
data class PartyRef(
    val id: String,
    val name: String,
)

/**
 * Resolved `{id, code, name}` reference for a product, embedded on every
 * detail line by `/api/mobile/documents/{type}/{id}` to save a per-line
 * catalog lookup on the client. `name` is the display string.
 */
@Serializable
data class ProductRef(
    val id: String,
    val code: String? = null,
    val name: String,
)

/**
 * Wire shape from `/api/mobile/documents/{type}/{id}`:
 *   `{ id, productId, product?: ProductRef, quantity, unitPrice, rowTotal }`
 *
 * Kotlin field names stay short (`price`, `total`) for ergonomic call sites
 * and snapshot factories — the JSON wire names are mapped via `@SerialName`.
 * `productName` is a convenience fallback for callers that synthesize lines
 * (snapshots, optimistic UI); when the server payload is decoded, prefer
 * `product?.name`.
 */
@Serializable
data class DocumentLine(
    val id: String,
    val productId: String,
    val productName: String? = null,
    val product: ProductRef? = null,
    val quantity: String,
    @SerialName("unitPrice") val price: String,
    @SerialName("rowTotal") val total: String,
)

/**
 * One invoice that a payment document has been applied against.
 * Returned by `GET /api/mobile/documents/{type}/{id}` for
 * `sales.payment_received` and `purchases.payment_sent` only.
 */
@Serializable
data class LinkedInvoiceRef(
    val invoiceId: String,
    val invoiceNumber: String? = null,
    val amount: String,
)

@Serializable
data class DocumentRecord(
    val id: String,
    val number: String,
    @Serializable(with = InstantIso8601Serializer::class) val date: Instant,
    val status: DocumentStatus,
    @Serializable(with = InstantIso8601Serializer::class) val createdAt: Instant,
    @Serializable(with = InstantIso8601Serializer::class) val updatedAt: Instant,
    @SerialName("lines") val items: List<DocumentLine>? = null,
    val total: String? = null,
    val customer: PartyRef? = null,
    val supplier: PartyRef? = null,
    /** Resolved `{id, name}` refs the detail endpoint embeds in the header.
     *  `PartyRefSerializer` also tolerates the raw-UUID-string form that the
     *  POST create response ships. */
    val warehouse: PartyRef? = null,
    val priceType: PartyRef? = null,
    /** Invoices this payment was applied against. Non-empty only for payment doc types. */
    val linkedInvoices: List<LinkedInvoiceRef> = emptyList(),
)

@Serializable
data class DocumentCreateResponse(val id: String, val record: DocumentRecord)

@Serializable
data class DocumentPostResponse(val movementCount: Int)

typealias DocumentListResponse = PaginatedResponse<DocumentRecord>
