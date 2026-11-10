package dev.ishflow.android.appshared.models

import dev.ishflow.android.appshared.serializers.BigDecimalSerializer
import dev.ishflow.android.appshared.serializers.InstantIso8601Serializer
import kotlinx.serialization.Serializable
import java.math.BigDecimal
import java.time.Instant

// Wire-typed request bodies for the mobile document create endpoints.
//
// Field-name gotchas (verified against configs/sales/documents and
// configs/purchases/documents):
// - Counterparty references are bare entity names: customer, supplier
//   (NEVER customerId / supplierId).
// - Line price field is `price` (NEVER `unitPrice`).
// - Comment field is `note` (NEVER `comment` — UI label is free to differ).
// - Decimal numerics serialize as JSON strings via BigDecimalSerializer.
// - Dates serialize as ISO-8601 strings via InstantIso8601Serializer.
// - `linkedInvoices` is a JSON-encoded string (NOT a JSON array). The server
//   parses it back to `Array<{ invoiceId, amount }>` inside the posting handler;
//   matches `parseLinkedInvoices` in configs/{sales,purchases}/documents/...
//   This mirrors the iOS poster's `encodeLinkedInvoices` helper so both
//   clients share one server contract.
//
// status defaults to SAVED. Pass DRAFT from a "Save draft" path; the caller
// is responsible for skipping the /post round-trip in that case.

@Serializable
data class PaymentReceivedCreate(
    val customer: String,
    @Serializable(with = InstantIso8601Serializer::class) val date: Instant,
    @Serializable(with = BigDecimalSerializer::class) val amount: BigDecimal,
    val note: String? = null,
    val linkedInvoices: String? = null,
    val status: DocumentStatus = DocumentStatus.SAVED,
    /**
     * Optional wizard hint: when set, the server rebinds every attachment
     * captured under this draft UUID to the freshly-created document id.
     */
    val attachmentDraftId: String? = null,
)

@Serializable
data class PaymentSentCreate(
    val supplier: String,
    @Serializable(with = InstantIso8601Serializer::class) val date: Instant,
    @Serializable(with = BigDecimalSerializer::class) val amount: BigDecimal,
    val note: String? = null,
    val linkedInvoices: String? = null,
    val status: DocumentStatus = DocumentStatus.SAVED,
    /**
     * Optional wizard hint: when set, the server rebinds every attachment
     * captured under this draft UUID to the freshly-created document id.
     */
    val attachmentDraftId: String? = null,
)

@Serializable
data class PurchaseInvoiceLineCreate(
    val product: String,
    @Serializable(with = BigDecimalSerializer::class) val quantity: BigDecimal,
    @Serializable(with = BigDecimalSerializer::class) val price: BigDecimal,
)

@Serializable
data class PurchaseInvoiceCreate(
    @Serializable(with = InstantIso8601Serializer::class) val date: Instant,
    val supplier: String,
    val warehouse: String,
    val lines: List<PurchaseInvoiceLineCreate>,
    val status: DocumentStatus = DocumentStatus.SAVED,
    /**
     * Optional wizard hint: when set, the server rebinds every attachment
     * captured under this draft UUID to the freshly-created document id.
     * Server side: `app/api/mobile/documents/[type]/route.ts` strips this
     * field before passing the payload to the engine and runs a
     * `tx.attachment.updateMany({ entityId: attachmentDraftId } -> { entityId: created.id })`.
     */
    val attachmentDraftId: String? = null,
)
