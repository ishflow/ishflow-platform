package dev.ishflow.android.feature.sales.wizard.payment_received

import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.DocumentStatus
import dev.ishflow.android.appshared.models.LinkedInvoice
import dev.ishflow.android.appshared.models.PaymentReceivedCreate
import dev.ishflow.android.core.RefreshTrigger
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import java.time.ZoneOffset
import java.util.UUID
import javax.inject.Inject

private const val DOCUMENT_KIND = "sales.payment_received"

/**
 * Posts a [PaymentReceivedDraft] to `/api/mobile/documents/sales.payment_received`
 * then transitions the record SAVED→POSTED.
 *
 * Wire-shape contract (canonical reference: `configs/sales/documents/payment-received.ts`,
 * mirrored in [PaymentReceivedCreate]):
 *   - `customer` (UUID string) — NEVER `customerId`.
 *   - `note` (NEVER `comment`). UI label is free to differ.
 *   - `amount` serialized as decimal string via `BigDecimalSerializer`.
 *   - `date` serialized as ISO-8601 via `InstantIso8601Serializer`.
 *   - `linkedInvoices` (optional) — JSON-encoded string of
 *     `[{invoiceId, amount}]`. The server parses it back to an array inside
 *     the posting handler (`parseLinkedInvoices` in
 *     `configs/sales/documents/payment-received.ts`). When empty, the field is
 *     omitted so the document falls back to single-bucket posting. Mirrors the
 *     iOS `encodeLinkedInvoices` helper.
 *   - `attachmentDraftId` (optional) — when set, the server rebinds every
 *     attachment captured under this draft UUID to the freshly-created document id.
 *
 * `relatedInvoiceId` on [PaymentReceivedDraft] is UI-only state for prefill
 * when the wizard is launched from an invoice screen; it is not sent on the
 * wire — multi-link mode supersedes that older single-bucket field.
 *
 * On successful post, fires [RefreshTrigger] with `minIntervalMillis = 0L`
 * so every subscribed list view-model (Sales, Dashboard, Inventory, Prices,
 * Docs) reloads immediately. Mirrors the iOS
 * `Notification.Name.ishflowDocumentsDidChange` pattern.
 */
class PaymentReceivedWizardPoster @Inject constructor(
    private val api: ApiService,
    private val refreshTrigger: RefreshTrigger,
    private val json: Json,
) {
    @Suppress("TooGenericExceptionCaught", "InstanceOfCheckForException")
    suspend fun postWizard(
        draft: PaymentReceivedDraft,
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

    /**
     * Creates the payment in DRAFT state without firing the SAVED→POSTED
     * transition. Mirrors [SalesWizardPoster.saveDraft] — the document lives in
     * the Docs list (filtered to Drafts) and the user can resume editing.
     */
    @Suppress("TooGenericExceptionCaught", "InstanceOfCheckForException")
    suspend fun saveDraft(
        draft: PaymentReceivedDraft,
        attachmentDraftId: String? = null,
    ): Result<String> = try {
        val created = create(draft, attachmentDraftId)
        refreshTrigger.fire(minIntervalMillis = 0L)
        Result.success(created.id)
    } catch (e: Exception) {
        if (e is kotlinx.coroutines.CancellationException) throw e
        Result.failure(e)
    }

    private suspend fun create(
        draft: PaymentReceivedDraft,
        attachmentDraftId: String? = null,
    ): dev.ishflow.android.appshared.models.DocumentCreateResponse {
        val customerId = draft.customerId ?: error("No customer selected")
        require(draft.isPostable()) { "Draft amount must be positive" }

        val body = PaymentReceivedCreate(
            customer = customerId,
            date = draft.date.atStartOfDay(ZoneOffset.UTC).toInstant(),
            amount = draft.amount,
            note = draft.note?.takeIf { it.isNotBlank() },
            linkedInvoices = encodeLinkedInvoices(draft.linkedInvoices),
            status = DocumentStatus.SAVED,
            attachmentDraftId = attachmentDraftId,
        )

        val idempotencyKey = UUID.randomUUID().toString()
        return api.createPaymentReceived(idempotencyKey, body)
    }

    private fun encodeLinkedInvoices(links: List<LinkedInvoice>): String? {
        if (links.isEmpty()) return null
        return json.encodeToString(ListSerializer(LinkedInvoice.serializer()), links)
    }
}
