package dev.ishflow.android.feature.purchases.wizard

import android.app.Activity
import android.content.IntentSender
import android.net.Uri
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.CatalogRecord
import dev.ishflow.android.appshared.models.DocumentStatus
import dev.ishflow.android.core.attachments.AttachmentMeta
import dev.ishflow.android.core.attachments.AttachmentUploader
import dev.ishflow.android.core.repository.CatalogRepository
import dev.ishflow.android.core.scanner.DocumentScanner
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID
import javax.inject.Inject

private const val WAREHOUSE_ENTITY_SLUG = "inventory.warehouse"
private const val PURCHASE_INVOICE_ATTACHMENT_ENTITY = "document.purchases.invoice"
private const val PRODUCT_ENTITY_SLUG = "inventory.product"

@HiltViewModel
class PurchaseInvoiceWizardViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val poster: PurchaseInvoiceWizardPoster,
    private val catalogs: CatalogRepository,
    private val uploader: AttachmentUploader,
    private val scanner: DocumentScanner,
    private val api: ApiService,
) : ViewModel() {

    private val existingDraftId: String = savedStateHandle.get<String>("draftId").orEmpty()

    /**
     * Stable per-wizard draft id. Attachments are uploaded with this as
     * `entityId`; on document create we ship it as `attachmentDraftId`
     * so the server rebinds the rows to the real document id.
     */
    val draftId: String = UUID.randomUUID().toString()

    private val _attachments = MutableStateFlow<List<AttachmentMeta>>(emptyList())
    val attachments: StateFlow<List<AttachmentMeta>> = _attachments

    private val _uploadingCount = MutableStateFlow(0)
    val uploadingCount: StateFlow<Int> = _uploadingCount

    private val _attachmentErrors = MutableStateFlow<String?>(null)
    val attachmentErrors: StateFlow<String?> = _attachmentErrors

    private val _scanIntents = Channel<IntentSender>(Channel.BUFFERED)
    val scanIntents = _scanIntents.receiveAsFlow()

    private val _draft = MutableStateFlow(PurchaseInvoiceWizardDraft())
    val draft: StateFlow<PurchaseInvoiceWizardDraft> = _draft

    private val _isPosting = MutableStateFlow(false)
    val isPosting: StateFlow<Boolean> = _isPosting

    private val _postResult = MutableStateFlow<Result<String>?>(null)
    val postResult: StateFlow<Result<String>?> = _postResult

    /**
     * Latches a token whenever a scanned barcode fails to resolve to a
     * product. The screen observes, shows a snackbar, then calls
     * [consumeBarcodeError] to clear. Token is a nanoTime so two
     * consecutive misses still re-emit.
     */
    private val _barcodeError = MutableStateFlow<Long?>(null)
    val barcodeError: StateFlow<Long?> = _barcodeError

    init {
        if (existingDraftId.isNotBlank()) {
            viewModelScope.launch { loadExistingDraft(existingDraftId) }
        } else {
            viewModelScope.launch { autoSelectWarehouseIfSingle() }
        }
    }

    /**
     * Loads an existing draft purchase invoice into the wizard state. Called
     * when the user taps "Continue editing" from [PurchaseDetailScreen] for a
     * DRAFT doc. Falls back to empty draft + warehouse auto-select on failure.
     */
    private suspend fun loadExistingDraft(id: String) {
        runCatching { api.getDocument("purchases.invoice", id) }
            .onSuccess { record ->
                _draft.value = PurchaseInvoiceWizardDraft.fromRecord(record)
                if (_draft.value.warehouse == null) autoSelectWarehouseIfSingle()
            }
            .onFailure { autoSelectWarehouseIfSingle() }
    }

    /**
     * iOS Faz 3d issue #2 — when the tenant has exactly one warehouse, skip
     * the picker and seed the draft so the user doesn't have to tap through
     * a single-option list. Silent on failure: the manual picker is still
     * available from the header step.
     */
    private suspend fun autoSelectWarehouseIfSingle() {
        if (_draft.value.warehouse != null) return
        runCatching { catalogs.refresh(WAREHOUSE_ENTITY_SLUG) }
        val warehouses = catalogs.observe(WAREHOUSE_ENTITY_SLUG).first()
        if (warehouses.size == 1 && _draft.value.warehouse == null) {
            _draft.value = _draft.value.copy(warehouse = warehouses.single())
        }
    }

    fun setSupplier(supplier: CatalogRecord) {
        _draft.value = _draft.value.copy(supplier = supplier)
    }

    fun setWarehouse(warehouse: CatalogRecord) {
        _draft.value = _draft.value.copy(warehouse = warehouse)
    }

    fun setDate(date: LocalDate) {
        _draft.value = _draft.value.copy(date = date)
    }

    fun setNote(note: String) {
        _draft.value = _draft.value.copy(note = note)
    }

    fun addLine(product: CatalogRecord) {
        _draft.value = _draft.value.copy(lines = _draft.value.lines + PurchaseLine(product = product))
    }

    /**
     * Resolves a scanned barcode to a product, then forwards to [addLine].
     * No server-side barcode endpoint exists yet — we match the scanned
     * token against the product `code` via the standard catalog list
     * endpoint. On no match, [barcodeError] latches and the screen surfaces
     * a snackbar.
     */
    fun addLineByBarcode(barcode: String) {
        val token = barcode.trim()
        if (token.isEmpty()) {
            emitBarcodeError()
            return
        }
        viewModelScope.launch {
            val product = runCatching {
                api.listCatalog(PRODUCT_ENTITY_SLUG, query = token, pageSize = 5)
            }.fold(
                onSuccess = { resp ->
                    resp.items.firstOrNull { it.code.equals(token, ignoreCase = true) }
                        ?: resp.items.firstOrNull()
                },
                onFailure = { e ->
                    if (e is CancellationException) throw e
                    null
                },
            )
            if (product != null) {
                addLine(product)
            } else {
                emitBarcodeError()
            }
        }
    }

    /** Caller signal that the snackbar has been shown — clears the latch. */
    fun consumeBarcodeError() {
        _barcodeError.value = null
    }

    private fun emitBarcodeError() {
        _barcodeError.value = System.nanoTime()
    }

    fun removeLine(lineId: String) {
        _draft.value = _draft.value.copy(
            lines = _draft.value.lines.filter { it.id != lineId },
        )
    }

    fun updateLineQuantity(lineId: String, quantity: BigDecimal) {
        _draft.value = _draft.value.copy(
            lines = _draft.value.lines.map { line ->
                if (line.id == lineId) line.copy(quantity = quantity) else line
            },
        )
    }

    fun updateLinePrice(lineId: String, price: BigDecimal) {
        _draft.value = _draft.value.copy(
            lines = _draft.value.lines.map { line ->
                if (line.id == lineId) line.copy(price = price) else line
            },
        )
    }

    fun post() = postWith(DocumentStatus.SAVED)

    fun saveDraft() = postWith(DocumentStatus.DRAFT)

    private fun postWith(status: DocumentStatus) {
        viewModelScope.launch {
            _isPosting.value = true
            val hasAttachments = _attachments.value.isNotEmpty()
            _postResult.value = poster.post(
                draft = _draft.value,
                status = status,
                attachmentDraftId = draftId.takeIf { hasAttachments },
            )
            _isPosting.value = false
        }
    }

    /**
     * Uploads [uri] as a new attachment on this draft. UI feedback flows
     * through [uploadingCount] and [attachmentErrors]; errors are translated
     * into user-facing copy on the snackbar side.
     */
    @Suppress("TooGenericExceptionCaught")
    fun attach(uri: Uri) {
        viewModelScope.launch {
            _uploadingCount.update { it + 1 }
            try {
                val result = uploader.upload(
                    uri = uri,
                    entity = PURCHASE_INVOICE_ATTACHMENT_ENTITY,
                    entityId = draftId,
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
     * Launches the ML Kit document scanner. Emits an [IntentSender] on
     * [scanIntents] for the screen to feed into a
     * `StartIntentSenderForResult` launcher.
     */
    @Suppress("TooGenericExceptionCaught")
    fun openScanner(activity: Activity) {
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

    /** Uploads every page URI returned by the scanner. */
    fun onScannerPages(pages: List<Uri>) {
        pages.forEach { attach(it) }
    }

    /**
     * Parses the activity-result intent ML Kit returns and uploads every
     * page. Exposed on the VM so the Composable doesn't need to hold a
     * separate handle to [DocumentScanner].
     */
    fun handleScanResult(data: android.content.Intent?) {
        onScannerPages(scanner.parseResult(data))
    }

    fun clearAttachmentError() {
        _attachmentErrors.value = null
    }
}
