package dev.ishflow.android.feature.sales.wizard.payment_received

import dev.ishflow.android.appshared.models.LinkedInvoice
import java.math.BigDecimal
import java.time.LocalDate

/**
 * Editable draft for the `sales.payment_received` wizard.
 *
 * Wire-shape contract (canonical reference: `configs/sales/documents/payment-received.ts`
 * on the web side, mirrored on `PaymentReceivedCreate`):
 *   - `customer` (UUID string) — NEVER `customerId` on the wire body. The draft
 *     stores the id under `customerId` for in-app clarity; the poster maps it
 *     to the wire field `customer`.
 *   - `note` (NOT `comment`).
 *   - `relatedInvoice` (UUID string, optional). The draft stores the id under
 *     `relatedInvoiceId` only for prefill display when the wizard is launched
 *     from an invoice detail screen; the poster does not send it on the wire.
 *   - `linkedInvoices` carries the optional multi-link allocation, serialized
 *     as a JSON-encoded string by the poster (matches the iOS contract).
 *   - `amount` decimal-string via `BigDecimalSerializer`.
 *   - `date` ISO-8601 string.
 */
data class PaymentReceivedDraft(
    val date: LocalDate = LocalDate.now(),
    val customerId: String? = null,
    val amount: BigDecimal = BigDecimal.ZERO,
    val relatedInvoiceId: String? = null,
    val note: String? = null,
    val linkedInvoices: List<LinkedInvoice> = emptyList(),
) {
    fun isPostable(): Boolean = customerId != null && amount.signum() > 0
}
