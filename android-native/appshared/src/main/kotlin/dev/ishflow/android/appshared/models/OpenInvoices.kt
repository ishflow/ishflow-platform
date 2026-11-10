package dev.ishflow.android.appshared.models

import dev.ishflow.android.appshared.serializers.BigDecimalSerializer
import dev.ishflow.android.appshared.serializers.InstantIso8601Serializer
import dev.ishflow.android.appshared.serializers.NumericBigDecimalSerializer
import kotlinx.serialization.Serializable
import java.math.BigDecimal
import java.time.Instant

/**
 * One row in the open-invoice picker.
 *
 * Wire payload from `GET /api/mobile/payments/open-invoices` (server route
 * `app/api/mobile/payments/open-invoices/route.ts`, contract
 * `packages/mobile-api-contract/src/payments.ts`):
 *  - `documentType`: `"sales.invoice"` for receivable, `"purchases.invoice"`
 *    for payable.
 *  - `invoiceDate`: ISO-8601 instant.
 *  - `totalAmount` / `paidAmount` / `openAmount`: JSON numbers (the server emits
 *    `number`, not decimal strings), deserialized via
 *    [NumericBigDecimalSerializer] for precision-safe arithmetic.
 *  - `currency`: ISO 4217 code (per-invoice override or tenant fallback).
 */
@Serializable
data class OpenInvoiceItem(
    val invoiceId: String,
    val documentType: String,
    val invoiceNumber: String,
    @Serializable(with = InstantIso8601Serializer::class) val invoiceDate: Instant,
    @Serializable(with = NumericBigDecimalSerializer::class) val totalAmount: BigDecimal,
    @Serializable(with = NumericBigDecimalSerializer::class) val paidAmount: BigDecimal,
    @Serializable(with = NumericBigDecimalSerializer::class) val openAmount: BigDecimal,
    val currency: String,
)

@Serializable
data class OpenInvoicesResponse(
    val items: List<OpenInvoiceItem>,
)

/**
 * One allocation row sent back inside a payment wizard's `linkedInvoices`
 * payload. Encoded as a JSON-string field on the create body (matches the iOS
 * client + `configs/sales/documents/payment-received.ts` `parseLinkedInvoices`
 * helper); amount serializes as a JSON number to match `parseLinkedInvoices`,
 * which expects `typeof item.amount === 'number'`.
 */
@Serializable
data class LinkedInvoice(
    val invoiceId: String,
    @Serializable(with = NumericBigDecimalSerializer::class) val amount: BigDecimal,
)
