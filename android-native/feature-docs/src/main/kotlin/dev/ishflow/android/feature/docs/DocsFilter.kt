package dev.ishflow.android.feature.docs

import androidx.annotation.StringRes
import dev.ishflow.android.feature.docs.R

/**
 * Chip-row filter for the Docs list.
 *
 * `All` fans out to every [DocumentKind]; the kind-specific variants restrict
 * the fan-out to a single kind. The chip row is single-select.
 */
sealed interface DocsFilter {
    @get:StringRes
    val labelRes: Int
    val kinds: List<DocumentKind>

    data object All : DocsFilter {
        override val labelRes: Int = R.string.docs_filter_all
        override val kinds: List<DocumentKind> = DocumentKind.ALL
    }

    data object Sales : DocsFilter {
        override val labelRes: Int = R.string.docs_filter_sales
        override val kinds: List<DocumentKind> = listOf(DocumentKind.SalesInvoice)
    }

    data object Purchases : DocsFilter {
        override val labelRes: Int = R.string.docs_filter_purchases
        override val kinds: List<DocumentKind> = listOf(DocumentKind.PurchaseInvoice)
    }

    data object PaymentReceived : DocsFilter {
        override val labelRes: Int = R.string.docs_filter_paymentReceived
        override val kinds: List<DocumentKind> = listOf(DocumentKind.PaymentReceived)
    }

    data object PaymentSent : DocsFilter {
        override val labelRes: Int = R.string.docs_filter_paymentSent
        override val kinds: List<DocumentKind> = listOf(DocumentKind.PaymentSent)
    }

    companion object {
        val ALL: List<DocsFilter> = listOf(All, Sales, Purchases, PaymentReceived, PaymentSent)
    }
}
