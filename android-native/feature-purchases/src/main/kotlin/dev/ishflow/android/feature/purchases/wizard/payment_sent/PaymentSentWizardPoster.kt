package dev.ishflow.android.feature.purchases.wizard.payment_sent

import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.DocumentStatus
import dev.ishflow.android.appshared.models.LinkedInvoice
import dev.ishflow.android.appshared.models.PaymentSentCreate
import dev.ishflow.android.core.RefreshTrigger
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import java.time.ZoneOffset
import java.util.UUID
import javax.inject.Inject

private const val DOCUMENT_KIND = "purchases.payment_sent"

/**
 * Posts a [PaymentSentDraft] to `/api/mobile/documents/purchases.payment_sent`
 * then transitions the record SAVED→POSTED.
 *
 * Wire-shape contract (canonical reference: `configs/purchases/documents/payment-sent.ts`,
 * mirrored in [PaymentSentCreate]):
 *   - `supplier` (UUID string) — NEVER `supplierId`.
 *   - `note` (NEVER `comment`). UI label is free to differ.
 *   - `amount` serialized as decimal string via `BigDecimalSerializer`.
 *   - `date` serialized as ISO-8601 via `InstantIso8601Serializer`.
 *   - `linkedInvoices` (optional) — JSON-encoded string of
 *     `[{invoiceId, amount}]`. Parsed back to an array by
 *     `parseLinkedInvoices` in `configs/purchases/documents/payment-sent.ts`.
 *     Mirrors the iOS `encodeLinkedInvoices` helper.
 *   - `attachmentDraftId` (optional) — when set, the server rebinds every
 *     attachment captured under this draft UUID to the freshly-created document id.
 *
 * `relatedInvoiceId` on [PaymentSentDraft] is UI-only state for prefill when
 * the wizard is launched from a purchase-invoice screen; it is not sent on
 * the wire — multi-link mode supersedes that older single-bucket field.
 *
 * On successful post, fires [RefreshTrigger] with `minIntervalMillis = 0L`
 * so every subscribed list view-model (Purchases, Dashboard, Inventory,
 * Prices, Docs) reloads immediately. Mirrors the
 * [dev.ishflow.android.feature.sales.wizard.SalesWizardPoster] pattern.
 */
class PaymentSentWizardPoster @Inject constructor(
    private val api: ApiService,
    private val refreshTrigger: RefreshTrigger,
    private val json: Json,
) {
    @Suppress("TooGenericExceptionCaught", "InstanceOfCheckForException")
    suspend fun postWizard(
        draft: PaymentSentDraft,
        attachmentDraftId: String? = null,
    ): Result<String> = try {
        val created = create(draft, attachmentDraftId)
        api.postDocument(DOCUMENT_KIND, created.id)
        refreshTrigger.fire(minIntervalMillis = 0L)
        Result.success(created.id)
    } catch (e: Exception) {
        if (e is kotlinx.coroutines.CancellationException) throw e
        Result.failure(e)
    }

    private suspend fun create(
        draft: PaymentSentDraft,
        attachmentDraftId: String? = null,
    ): dev.ishflow.android.appshared.models.DocumentCreateResponse {
        val supplierId = draft.supplierId ?: error("No supplier selected")
        require(draft.isPostable()) { "Draft amount must be positive" }

        val body = PaymentSentCreate(
            supplier = supplierId,
            date = draft.date.atStartOfDay(ZoneOffset.UTC).toInstant(),
            amount = draft.amount,
            note = draft.note?.takeIf { it.isNotBlank() },
            linkedInvoices = encodeLinkedInvoices(draft.linkedInvoices),
            status = DocumentStatus.SAVED,
            attachmentDraftId = attachmentDraftId,
        )

        val idempotencyKey = UUID.randomUUID().toString()
        return api.createPaymentSent(idempotencyKey, body)
    }

    private fun encodeLinkedInvoices(links: List<LinkedInvoice>): String? {
        if (links.isEmpty()) return null
        return json.encodeToString(ListSerializer(LinkedInvoice.serializer()), links)
    }
}
