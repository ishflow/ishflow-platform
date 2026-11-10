package dev.ishflow.android.feature.purchases.wizard.payment_sent

import dev.ishflow.android.appshared.models.LinkedInvoice
import java.math.BigDecimal
import java.time.LocalDate

/**
 * Editable draft for the `purchases.payment_sent` wizard.
 *
 * Wire-shape contract (canonical reference: `configs/purchases/documents/payment-sent.ts`
 * on the web side, mirrored on `PaymentSentCreate`):
 *   - `supplier` (UUID string) — NEVER `supplierId` on the wire body. The draft
 *     stores the id under `supplierId` for in-app clarity; the poster maps it
 *     to the wire field `supplier`.
 *   - `note` (NOT `comment`).
 *   - `linkedInvoices` carries the optional multi-link allocation, serialized
 *     as a JSON-encoded string by the poster (matches the iOS contract).
 *   - `amount` decimal-string via `BigDecimalSerializer`.
 *   - `date` ISO-8601 string.
 *
 * `relatedInvoiceId` is UI-only state for prefill when the wizard is launched
 * from a purchase-invoice screen.
 */
data class PaymentSentDraft(
    val date: LocalDate = LocalDate.now(),
    val supplierId: String? = null,
    val amount: BigDecimal = BigDecimal.ZERO,
    val relatedInvoiceId: String? = null,
    val note: String? = null,
    val linkedInvoices: List<LinkedInvoice> = emptyList(),
) {
    fun isPostable(): Boolean = supplierId != null && amount.signum() > 0
}
