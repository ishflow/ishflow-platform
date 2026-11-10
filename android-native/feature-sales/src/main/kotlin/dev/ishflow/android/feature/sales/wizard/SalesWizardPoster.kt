package dev.ishflow.android.feature.sales.wizard

import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.core.RefreshTrigger
import java.time.ZoneOffset
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import javax.inject.Inject

/**
 * Persists a SalesInvoice wizard draft and, on `postWizard`, transitions it
 * to POSTED. Routes through `/api/mobile/documents/sales.invoice` — POST for
 * fresh drafts, PATCH for resumed Saved drafts — then `/post` for the
 * SAVED→POSTED transition.
 *
 * Wire-shape contract (canonical reference:
 * `configs/sales/documents/sales-invoice.ts` on the web side):
 *   - Header: `customer` (UUID string) — NOT `customerId`.
 *   - Line: `product` (UUID string) + `quantity` (decimal string) + `price` (decimal
 *     string) — NOT `productId` / `unitPrice`.
 *   - Decimals are serialized as `BigDecimal.toPlainString()` to survive JSON precision
 *     loss.
 *
 * On successful post, fires [RefreshTrigger] with `minIntervalMillis = 0L` so every
 * subscribed list view-model (Sales, Dashboard, Inventory, Prices) reloads immediately.
 *
 * NOTE for future wizard authors: when Purchase / Payment-Received / Payment-Sent
 * wizards land on Android, each one MUST inject [RefreshTrigger] and call
 * `refreshTrigger.fire(minIntervalMillis = 0L)` on every successful post or
 * save-draft, mirroring the iOS `Notification.Name.ishflowDocumentsDidChange`
 * pattern.
 */
class SalesWizardPoster @Inject constructor(
    private val api: ApiService,
    private val refreshTrigger: RefreshTrigger,
) {
    /**
     * Persists the wizard draft and transitions it to POSTED. When [draftId]
     * is non-null we PATCH the existing SAVED record in place (the user
     * resumed an existing draft from the docs list); otherwise we create a
     * fresh one. Either path is followed by the standard `:post` transition.
     *
     * The previous create-only flow leaked duplicate SAVED rows on every
     * retry — a botched post left the new row stranded next to the original.
     */
    @Suppress("TooGenericExceptionCaught", "InstanceOfCheckForException")
    suspend fun postWizard(
        draft: WizardDraft,
        draftId: String? = null,
        attachmentDraftId: String? = null,
    ): Result<String> = try {
        val resolvedId = upsert(draft, draftId, attachmentDraftId).id
        api.postDocument("sales.invoice", resolvedId)
        refreshTrigger.fire(minIntervalMillis = 0L)
        Result.success(resolvedId)
    } catch (e: Exception) {
        if (e is kotlinx.coroutines.CancellationException) throw e
        Result.failure(e)
    }

    /**
     * Persists the wizard draft in SAVED state without firing the post
     * transition. When [draftId] is non-null we PATCH the existing record;
     * otherwise we create a fresh one. Mirrors iOS `saveDraft`.
     */
    @Suppress("TooGenericExceptionCaught", "InstanceOfCheckForException")
    suspend fun saveDraft(
        draft: WizardDraft,
        draftId: String? = null,
        attachmentDraftId: String? = null,
    ): Result<String> = try {
        val resolvedId = upsert(draft, draftId, attachmentDraftId).id
        refreshTrigger.fire(minIntervalMillis = 0L)
        Result.success(resolvedId)
    } catch (e: Exception) {
        if (e is kotlinx.coroutines.CancellationException) throw e
        Result.failure(e)
    }

    /**
     * Builds the wire payload once, then dispatches to create or update
     * based on whether the wizard is editing an existing SAVED row.
     */
    private suspend fun upsert(
        draft: WizardDraft,
        draftId: String?,
        attachmentDraftId: String?,
    ): dev.ishflow.android.appshared.models.DocumentCreateResponse {
        val body = buildPayload(draft, attachmentDraftId)
        return if (draftId.isNullOrBlank()) {
            api.createDocument("sales.invoice", body)
        } else {
            api.updateDocument("sales.invoice", draftId, body)
        }
    }

    private fun buildPayload(draft: WizardDraft, attachmentDraftId: String?): JsonElement {
        val customer = draft.customer ?: error("No customer selected")
        val warehouse = draft.warehouse ?: error("No warehouse selected")
        require(draft.lines.isNotEmpty()) { "No lines added" }

        return buildJsonObject {
            put("customer", customer.id)
            put("warehouse", warehouse.id)
            // Server expects an ISO-8601 datetime — `Date.getTime()` is called
            // unconditionally inside `assertPeriodOpen`. A plain LocalDate
            // string ("2026-05-12") crashes with a TypeError → 500. Anchor at
            // UTC midnight so the doc date stays calendar-stable across
            // timezones (mirrors PaymentReceivedWizardPoster).
            put("date", draft.date.atStartOfDay(ZoneOffset.UTC).toInstant().toString())
            draft.priceType?.id?.let { put("priceType", it) }
            attachmentDraftId?.let { put("attachmentDraftId", it) }
            put(
                "lines",
                buildJsonArray {
                    draft.lines.forEach { line ->
                        add(
                            buildJsonObject {
                                put("product", line.product.id)
                                put("quantity", line.quantity.toPlainString())
                                put("price", line.unitPrice.toPlainString())
                            },
                        )
                    }
                },
            )
        }
    }
}
