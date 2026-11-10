package dev.ishflow.android.feature.docs

import dev.ishflow.android.appshared.models.DocumentRecord
import dev.ishflow.android.appshared.models.DocumentStatus
import java.math.BigDecimal
import java.time.Instant

/**
 * Type-discriminated row model for the unified Docs list.
 *
 * Wraps a [DocumentRecord] alongside the [DocumentKind] it was fetched as, so
 * the merged list (sorted by date desc) can render the correct icon/label and
 * route to the matching detail screen on tap.
 *
 * Carries the resolved counterparty id (customer for sales, supplier for
 * purchases) and decimal [total] so the advanced filter sheet can apply
 * client-side predicates without round-tripping to the network.
 */
data class DocumentSummary(
    val id: String,
    val kind: DocumentKind,
    val number: String,
    val date: Instant,
    val status: DocumentStatus,
    val counterpartyId: String? = null,
    val counterpartyName: String? = null,
    val total: BigDecimal? = null,
) {
    companion object {
        fun from(record: DocumentRecord, kind: DocumentKind): DocumentSummary = DocumentSummary(
            id = record.id,
            kind = kind,
            number = record.number,
            date = record.date,
            status = record.status,
            counterpartyId = record.customer?.id ?: record.supplier?.id,
            counterpartyName = record.customer?.name ?: record.supplier?.name,
            total = record.total?.toBigDecimalOrNull(),
        )
    }
}
