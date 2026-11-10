package dev.ishflow.android.feature.purchases.wizard

import dev.ishflow.android.appshared.models.CatalogRecord
import dev.ishflow.android.appshared.models.DocumentRecord
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID

/**
 * One editable line on a purchase invoice wizard draft.
 *
 * Note: wire field is `price` (NOT `unitPrice`) — see PurchaseInvoiceLineCreate.
 */
data class PurchaseLine(
    val id: String = UUID.randomUUID().toString(),
    val product: CatalogRecord,
    val quantity: BigDecimal = BigDecimal.ONE,
    val price: BigDecimal = BigDecimal.ZERO,
) {
    val rowTotal: BigDecimal get() = quantity.multiply(price)
}

/**
 * Draft state for the purchase-invoice wizard. Mirrors the iOS draft shape
 * so the eventual Faz 3 detail screen can hydrate the same fields.
 */
data class PurchaseInvoiceWizardDraft(
    val supplier: CatalogRecord? = null,
    val warehouse: CatalogRecord? = null,
    val date: LocalDate = LocalDate.now(),
    val note: String = "",
    val lines: List<PurchaseLine> = emptyList(),
) {
    val total: BigDecimal
        get() = lines.fold(BigDecimal.ZERO) { acc, line -> acc.add(line.rowTotal) }

    companion object {
        /**
         * Restores a [PurchaseInvoiceWizardDraft] from a server [DocumentRecord]
         * so the user can continue editing a saved draft purchase invoice.
         * Fields not returned by the detail endpoint (warehouse) are left null
         * and filled by [PurchaseInvoiceWizardViewModel.autoSelectWarehouseIfSingle]
         * or user interaction.
         */
        fun fromRecord(record: DocumentRecord): PurchaseInvoiceWizardDraft {
            val supplier = record.supplier?.let { party ->
                CatalogRecord(
                    id = party.id,
                    name = party.name,
                    createdAt = Instant.EPOCH,
                    updatedAt = Instant.EPOCH,
                )
            }
            val date = record.date.atZone(ZoneId.systemDefault()).toLocalDate()
            val lines = record.items.orEmpty().map { line ->
                val product = CatalogRecord(
                    id = line.productId,
                    name = line.productName ?: line.productId,
                    createdAt = Instant.EPOCH,
                    updatedAt = Instant.EPOCH,
                )
                PurchaseLine(
                    id = line.id,
                    product = product,
                    quantity = line.quantity.toBigDecimalOrNull() ?: BigDecimal.ONE,
                    price = line.price.toBigDecimalOrNull() ?: BigDecimal.ZERO,
                )
            }
            return PurchaseInvoiceWizardDraft(supplier = supplier, date = date, lines = lines)
        }
    }
}
