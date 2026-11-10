package dev.ishflow.android.feature.purchases.wizard

import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.DocumentStatus
import dev.ishflow.android.appshared.models.PurchaseInvoiceCreate
import dev.ishflow.android.appshared.models.PurchaseInvoiceLineCreate
import java.time.ZoneOffset
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Posts a purchase-invoice wizard draft.
 *
 * Implements the iOS-style idempotent retry pattern: if the create call
 * succeeds but the subsequent `/post` call fails, the next call to [post]
 * with the same draft skips the create step and retries only the post.
 *
 * The cache is keyed by an identity hash so a fresh wizard never reuses an
 * old draft's document id. Caller is expected to instantiate one poster per
 * wizard (Hilt scopes this to the wizard's ViewModel via @Singleton above
 * the call site; but the cache is per-draft anyway).
 */
@Singleton
class PurchaseInvoiceWizardPoster @Inject constructor(private val api: ApiService) {

    private var lastCreatedDocumentId: String? = null
    private var lastCreatedDraftFingerprint: Int? = null

    @Suppress("TooGenericExceptionCaught", "InstanceOfCheckForException")
    suspend fun post(
        draft: PurchaseInvoiceWizardDraft,
        status: DocumentStatus = DocumentStatus.SAVED,
        attachmentDraftId: String? = null,
    ): Result<String> = try {
        val supplier = draft.supplier ?: error("No supplier selected")
        val warehouse = draft.warehouse ?: error("No warehouse selected")
        require(draft.lines.isNotEmpty()) { "No lines added" }

        val body = PurchaseInvoiceCreate(
            date = draft.date.atStartOfDay(ZoneOffset.UTC).toInstant(),
            supplier = supplier.id,
            warehouse = warehouse.id,
            status = status,
            lines = draft.lines.map { line ->
                PurchaseInvoiceLineCreate(
                    product = line.product.id,
                    quantity = line.quantity,
                    price = line.price,
                )
            },
            attachmentDraftId = attachmentDraftId,
        )

        val fingerprint = draft.fingerprint()
        val createdId = lastCreatedDocumentId
            ?.takeIf { lastCreatedDraftFingerprint == fingerprint }
            ?: run {
                val created = api.createPurchaseInvoice(
                    idempotencyKey = UUID.randomUUID().toString(),
                    body = body,
                )
                lastCreatedDocumentId = created.id
                lastCreatedDraftFingerprint = fingerprint
                created.id
            }

        if (status != DocumentStatus.DRAFT) {
            api.postDocument(PURCHASE_INVOICE_WIRE_ID, createdId)
        }
        // Both steps succeeded; clear the retry cache so the next wizard run starts fresh.
        lastCreatedDocumentId = null
        lastCreatedDraftFingerprint = null
        Result.success(createdId)
    } catch (e: Exception) {
        if (e is kotlinx.coroutines.CancellationException) throw e
        Result.failure(e)
    }

    private fun PurchaseInvoiceWizardDraft.fingerprint(): Int = listOf(
        supplier?.id,
        warehouse?.id,
        date.toString(),
        lines.map { Triple(it.product.id, it.quantity, it.price) },
    ).hashCode()

    private companion object {
        const val PURCHASE_INVOICE_WIRE_ID = "purchases.invoice"
    }
}
