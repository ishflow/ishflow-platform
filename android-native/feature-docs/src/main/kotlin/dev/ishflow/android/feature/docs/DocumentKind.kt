package dev.ishflow.android.feature.docs

import androidx.annotation.StringRes
import dev.ishflow.android.feature.docs.R

/**
 * Discriminator for the unified Docs tab.
 *
 * Each kind maps 1:1 to a backend wire id consumed by `ApiService.listDocuments(type)`.
 * Wire ids are stable and verified against the TypeScript configs under `configs/`.
 */
enum class DocumentKind(
    val wireId: String,
    @StringRes val labelRes: Int,
) {
    SalesInvoice(wireId = "sales.invoice", labelRes = R.string.docs_kind_sales),
    PurchaseInvoice(wireId = "purchases.invoice", labelRes = R.string.docs_kind_purchase),
    PaymentReceived(wireId = "sales.payment_received", labelRes = R.string.docs_kind_paymentReceived),
    PaymentSent(wireId = "purchases.payment_sent", labelRes = R.string.docs_kind_paymentSent),
    ;

    companion object {
        val ALL: List<DocumentKind> = entries.toList()
    }
}
