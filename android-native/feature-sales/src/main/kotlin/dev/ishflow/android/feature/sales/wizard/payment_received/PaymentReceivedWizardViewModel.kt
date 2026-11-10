package dev.ishflow.android.feature.sales.wizard.payment_received

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.CatalogRecord
import dev.ishflow.android.appshared.models.LinkedInvoice
import dev.ishflow.android.appshared.models.OpenInvoiceItem
import dev.ishflow.android.core.attachments.AttachmentMeta
import dev.ishflow.android.core.attachments.AttachmentUploader
import dev.ishflow.android.core.scanner.DocumentScanner
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID
import javax.inject.Inject

private const val PAYMENT_RECEIVED_ATTACHMENT_ENTITY = "document.sales.payment_received"

/**
 * UI projection of one [OpenInvoiceItem] inside the multi-link picker.
 * `selected` and `allocated` are mutable state driven by the user.
 */
data class OpenInvoiceRowState(
    val item: OpenInvoiceItem,
    val selected: Boolean = false,
    val allocated: BigDecimal = BigDecimal.ZERO,
)

/**
 * Async state for the open-invoice list inside the wizard.
 */
sealed interface OpenInvoicesUiState {
    data object Idle : OpenInvoicesUiState
    data object Loading : OpenInvoicesUiState
    data class Loaded(val rows: List<OpenInvoiceRowState>) : OpenInvoicesUiState
    data class Failed(val exception: Throwable) : OpenInvoicesUiState
}

/**
 * UI-state machine for the Payment Received wizard.
 *
 * - [Editing] is the only state that exposes the mutable [PaymentReceivedDraft].
 * - [Submitting] is entered on [PaymentReceivedWizardViewModel.post] and exited
 *   on poster completion.
 * - [Success] carries the created document id; the screen consumes it to
 *   trigger `onDone` and navigate away.
 * - [Failed] carries the underlying exception so the UI can render an error
 *   surface and offer Retry. Returning to editing is done via [retry].
 */
sealed interface PaymentReceivedUiState {
    data class Editing(val draft: PaymentReceivedDraft) : PaymentReceivedUiState
    data class Submitting(val draft: PaymentReceivedDraft) : PaymentReceivedUiState
    data class Success(val id: String) : PaymentReceivedUiState
    data class Failed(val exception: Throwable, val draft: PaymentReceivedDraft) : PaymentReceivedUiState
}

@HiltViewModel
class PaymentReceivedWizardViewModel @Inject constructor(
    private val poster: PaymentReceivedWizardPoster,
    private val api: ApiService,
    private val uploader: AttachmentUploader,
    private val scanner: DocumentScanner,
) : ViewModel() {

    private val _uiState = MutableStateFlow<PaymentReceivedUiState>(
        PaymentReceivedUiState.Editing(PaymentReceivedDraft()),
    )
    val uiState: StateFlow<PaymentReceivedUiState> = _uiState.asStateFlow()

    /**
     * Stable per-wizard draft attachment id. Attachments upload with this as
     * `entityId`; on document create we ship it as `attachmentDraftId` in the
     * payload so the server rebinds rows to the real document id.
     */
    val draftAttachmentId: String = UUID.randomUUID().toString()

    private val _attachments = MutableStateFlow<List<AttachmentMeta>>(emptyList())
    val attachments: StateFlow<List<AttachmentMeta>> = _attachments

    private val _uploadingCount = MutableStateFlow(0)
    val uploadingCount: StateFlow<Int> = _uploadingCount

    private val _attachmentErrors = MutableStateFlow<String?>(null)
    val attachmentErrors: StateFlow<String?> = _attachmentErrors

    private val _scanIntents = kotlinx.coroutines.channels.Channel<android.content.IntentSender>(
        kotlinx.coroutines.channels.Channel.BUFFERED,
    )
    val scanIntents = _scanIntents.receiveAsFlow()

    /**
     * UI-side display shadow of the picked customer. The wire body only carries
     * [PaymentReceivedDraft.customerId]; the screen still needs name + code to
     * render the picked-customer card without re-fetching the catalog.
     */
    private val _selectedCustomer = MutableStateFlow<CatalogRecord?>(null)
    val selectedCustomer: StateFlow<CatalogRecord?> = _selectedCustomer.asStateFlow()

    private val _openInvoices = MutableStateFlow<OpenInvoicesUiState>(OpenInvoicesUiState.Idle)
    val openInvoices: StateFlow<OpenInvoicesUiState> = _openInvoices.asStateFlow()

    fun setCustomer(customer: CatalogRecord) {
        _selectedCustomer.value = customer
        updateDraft { it.copy(customerId = customer.id, linkedInvoices = emptyList()) }
        loadOpenInvoices(customer.id)
    }

    fun setDate(date: LocalDate) {
        updateDraft { it.copy(date = date) }
    }

    fun setAmount(amount: BigDecimal) {
        updateDraft { it.copy(amount = amount) }
    }

    fun setNote(note: String?) {
        updateDraft { it.copy(note = note?.takeIf { v -> v.isNotBlank() }) }
    }

    fun setRelatedInvoice(invoiceId: String?) {
        updateDraft { it.copy(relatedInvoiceId = invoiceId) }
    }

    /**
     * Toggle row selection. On select, defaults the allocation to the row's
     * `openAmount` clamped to whatever budget remains on the wizard's `amount`
     * total. On deselect, drops the row's allocation to zero. Refreshes the
     * draft's `linkedInvoices` snapshot so the poster sees a consistent view.
     */
    fun toggleInvoiceSelection(invoiceId: String) {
        val state = _openInvoices.value as? OpenInvoicesUiState.Loaded ?: return
        val draft = currentDraft() ?: return
        val rows = state.rows.map { row ->
            if (row.item.invoiceId != invoiceId) return@map row
            if (row.selected) {
                row.copy(selected = false, allocated = BigDecimal.ZERO)
            } else {
                val remaining = remainingBudget(draft.amount, state.rows, exclude = row.item.invoiceId)
                val defaultAllocated = row.item.openAmount.min(remaining).coerceAtLeast(BigDecimal.ZERO)
                row.copy(selected = true, allocated = defaultAllocated)
            }
        }
        _openInvoices.value = OpenInvoicesUiState.Loaded(rows)
        syncDraftLinkedInvoices(rows)
    }

    /**
     * Override the per-row allocated amount. Validation (sum vs. wizard total)
     * happens at post time inside the screen's "can save" computation.
     */
    fun setInvoiceAllocation(invoiceId: String, allocated: BigDecimal) {
        val state = _openInvoices.value as? OpenInvoicesUiState.Loaded ?: return
        val safe = allocated.coerceAtLeast(BigDecimal.ZERO)
        val rows = state.rows.map { row ->
            if (row.item.invoiceId == invoiceId) row.copy(allocated = safe) else row
        }
        _openInvoices.value = OpenInvoicesUiState.Loaded(rows)
        syncDraftLinkedInvoices(rows)
    }

    private fun remainingBudget(
        total: BigDecimal,
        rows: List<OpenInvoiceRowState>,
        exclude: String,
    ): BigDecimal {
        val allocated = rows
            .filter { it.selected && it.item.invoiceId != exclude }
            .fold(BigDecimal.ZERO) { acc, r -> acc + r.allocated }
        return (total - allocated).coerceAtLeast(BigDecimal.ZERO)
    }

    private fun syncDraftLinkedInvoices(rows: List<OpenInvoiceRowState>) {
        val links = rows
            .filter { it.selected && it.allocated.signum() > 0 }
            .map { LinkedInvoice(invoiceId = it.item.invoiceId, amount = it.allocated) }
        updateDraft { it.copy(linkedInvoices = links) }
    }

    private fun loadOpenInvoices(counterpartyId: String) {
        _openInvoices.value = OpenInvoicesUiState.Loading
        viewModelScope.launch {
            try {
                val response = api.getOpenInvoices(counterpartyId, "receivable")
                _openInvoices.value = OpenInvoicesUiState.Loaded(
                    response.items.map { OpenInvoiceRowState(item = it) },
                )
            } catch (e: kotlinx.coroutines.CancellationException) {
                throw e
            } catch (e: Exception) {
                _openInvoices.value = OpenInvoicesUiState.Failed(e)
            }
        }
    }

    fun post() {
        val draft = currentDraft() ?: return
        if (!draft.isPostable()) return
        _uiState.value = PaymentReceivedUiState.Submitting(draft)
        viewModelScope.launch {
            val hasAttachments = _attachments.value.isNotEmpty()
            val result = poster.postWizard(
                draft,
                attachmentDraftId = draftAttachmentId.takeIf { hasAttachments },
            )
            _uiState.value = result.fold(
                onSuccess = { id -> PaymentReceivedUiState.Success(id) },
                onFailure = { error -> PaymentReceivedUiState.Failed(error, draft) },
            )
        }
    }

    /**
     * Persists the payment in DRAFT state without firing the SAVED→POSTED
     * transition. Mirrors [SalesWizardViewModel.saveDraft] — the document lives
     * in the Docs list (filtered to Drafts) and the user can resume editing.
     */
    fun saveDraft() {
        val draft = currentDraft() ?: return
        if (!draft.isPostable()) return
        _uiState.value = PaymentReceivedUiState.Submitting(draft)
        viewModelScope.launch {
            val hasAttachments = _attachments.value.isNotEmpty()
            val result = poster.saveDraft(
                draft,
                attachmentDraftId = draftAttachmentId.takeIf { hasAttachments },
            )
            _uiState.value = result.fold(
                onSuccess = { id -> PaymentReceivedUiState.Success(id) },
                onFailure = { error -> PaymentReceivedUiState.Failed(error, draft) },
            )
        }
    }

    fun retry() {
        val state = _uiState.value
        if (state is PaymentReceivedUiState.Failed) {
            _uiState.value = PaymentReceivedUiState.Editing(state.draft)
        }
    }

    /**
     * Uploads [uri] as a new attachment on this draft. UI feedback flows
     * through [uploadingCount] and [attachmentErrors].
     */
    @Suppress("TooGenericExceptionCaught")
    fun attach(uri: android.net.Uri) {
        viewModelScope.launch {
            _uploadingCount.update { it + 1 }
            try {
                val result = uploader.upload(
                    uri = uri,
                    entity = PAYMENT_RECEIVED_ATTACHMENT_ENTITY,
                    entityId = draftAttachmentId,
                )
                result.fold(
                    onSuccess = { meta -> _attachments.update { it + meta } },
                    onFailure = { err -> _attachmentErrors.value = err.localizedMessage ?: err.message },
                )
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _attachmentErrors.value = e.localizedMessage ?: e.message
            } finally {
                _uploadingCount.update { (it - 1).coerceAtLeast(0) }
            }
        }
    }

    fun detach(attachmentId: String) {
        _attachments.update { current -> current.filterNot { it.id == attachmentId } }
    }

    /**
     * Launches the ML Kit document scanner. Emits an [android.content.IntentSender] on
     * [scanIntents] for the screen to feed into a `StartIntentSenderForResult` launcher.
     */
    @Suppress("TooGenericExceptionCaught")
    fun openScanner(activity: android.app.Activity) {
        viewModelScope.launch {
            try {
                val sender = scanner.buildIntentSender(activity)
                _scanIntents.send(sender)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _attachmentErrors.value = e.localizedMessage ?: e.message
            }
        }
    }

    /** Parses the activity-result intent ML Kit returns and uploads every page. */
    fun handleScanResult(data: android.content.Intent?) {
        scanner.parseResult(data).forEach { attach(it) }
    }

    fun clearAttachmentError() {
        _attachmentErrors.value = null
    }

    private fun currentDraft(): PaymentReceivedDraft? = when (val state = _uiState.value) {
        is PaymentReceivedUiState.Editing -> state.draft
        is PaymentReceivedUiState.Submitting -> state.draft
        is PaymentReceivedUiState.Failed -> state.draft
        is PaymentReceivedUiState.Success -> null
    }

    private fun updateDraft(transform: (PaymentReceivedDraft) -> PaymentReceivedDraft) {
        val state = _uiState.value
        if (state !is PaymentReceivedUiState.Editing) return
        _uiState.value = PaymentReceivedUiState.Editing(transform(state.draft))
    }
}
