package dev.ishflow.android.feature.docs.filter

import dev.ishflow.android.appshared.models.DocumentStatus
import dev.ishflow.android.feature.docs.DocumentKind
import dev.ishflow.android.feature.docs.DocumentSummary
import java.math.BigDecimal
import java.time.LocalDate
import java.time.ZoneId

/**
 * Predicate state for the advanced Docs filter sheet.
 *
 * All fields are nullable / empty by default so an unset filter is the
 * identity transform. [activeCount] feeds the top-bar badge — it groups
 * date / counterparty / amount / status / kind as five logical buckets so
 * the badge stays small (max 5) regardless of how many individual chips
 * are toggled inside a bucket.
 */
data class DocsFilterState(
    val dateFrom: LocalDate? = null,
    val dateTo: LocalDate? = null,
    val counterpartyId: String? = null,
    val counterpartyName: String? = null,
    val amountMin: BigDecimal? = null,
    val amountMax: BigDecimal? = null,
    val statuses: Set<String> = emptySet(),
    val kinds: Set<String> = emptySet(),
) {
    val isActive: Boolean
        get() = dateFrom != null || dateTo != null || counterpartyId != null ||
            amountMin != null || amountMax != null ||
            statuses.isNotEmpty() || kinds.isNotEmpty()

    val activeCount: Int
        get() = listOf(
            dateFrom != null || dateTo != null,
            counterpartyId != null,
            amountMin != null || amountMax != null,
            statuses.isNotEmpty(),
            kinds.isNotEmpty(),
        ).count { it }

    /**
     * Apply this filter to a list of [DocumentSummary] rows.
     *
     * Date comparison uses the system default zone — same convention as the
     * Material 3 date picker which returns local-day instants. Amount and
     * counterparty fall back to "pass" when the summary lacks the field
     * (e.g. fan-out kinds that don't carry totals).
     */
    fun apply(rows: List<DocumentSummary>): List<DocumentSummary> {
        if (!isActive) return rows
        val zone = ZoneId.systemDefault()
        return rows.filter { row ->
            val rowDate = row.date.atZone(zone).toLocalDate()
            val passDateFrom = dateFrom?.let { !rowDate.isBefore(it) } ?: true
            val passDateTo = dateTo?.let { !rowDate.isAfter(it) } ?: true
            val passCounterparty = counterpartyId?.let { it == row.counterpartyId } ?: true
            val passAmountMin = amountMin?.let { min ->
                row.total?.let { it >= min } ?: false
            } ?: true
            val passAmountMax = amountMax?.let { max ->
                row.total?.let { it <= max } ?: false
            } ?: true
            val passStatuses = statuses.isEmpty() ||
                statuses.contains(row.status.wireId())
            val passKinds = kinds.isEmpty() || kinds.contains(row.kind.wireId)
            passDateFrom && passDateTo && passCounterparty &&
                passAmountMin && passAmountMax && passStatuses && passKinds
        }
    }

    companion object {
        /** Sentinel values used in the [statuses] set. */
        const val STATUS_DRAFT = "draft"
        const val STATUS_POSTED = "posted"
        const val STATUS_CANCELED = "canceled"
        val ALL_STATUSES: List<String> = listOf(STATUS_DRAFT, STATUS_POSTED, STATUS_CANCELED)
        val ALL_KINDS: List<DocumentKind> = DocumentKind.ALL
    }
}

private fun DocumentStatus.wireId(): String = when (this) {
    DocumentStatus.DRAFT, DocumentStatus.SAVED -> DocsFilterState.STATUS_DRAFT
    DocumentStatus.POSTED -> DocsFilterState.STATUS_POSTED
    DocumentStatus.CANCELLED -> DocsFilterState.STATUS_CANCELED
}
