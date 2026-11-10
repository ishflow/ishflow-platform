package dev.ishflow.android.feature.purchases

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.api.ApiException
import dev.ishflow.android.appshared.api.toApiException
import dev.ishflow.android.appshared.models.AttachmentRecord
import dev.ishflow.android.appshared.models.DocumentRecord
import dev.ishflow.android.core.cache.DetailCache
import dev.ishflow.android.core.pdf.PdfShareService
import dev.ishflow.android.core.ui.AppSnackbarController
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject
import dev.ishflow.android.appshared.R as SharedR

private const val DOCUMENT_TYPE = "purchases.invoice"

sealed interface PurchaseDetailEvent {
    data class ClonedTo(val id: String) : PurchaseDetailEvent
    data object Posted : PurchaseDetailEvent
    data object Unposted : PurchaseDetailEvent
    data class Error(val message: String) : PurchaseDetailEvent
}

sealed class PurchaseDetailUiState {
    data object Loading : PurchaseDetailUiState()
    data class Loaded(
        val document: DocumentRecord,
        val attachments: List<AttachmentRecord> = emptyList(),
    ) : PurchaseDetailUiState()
    data class Failed(val exception: ApiException) : PurchaseDetailUiState()
}

/**
 * Detail view-model for a single `purchases.invoice` document. Fetches the
 * enriched payload from the mobile `getDocument` endpoint — `DocumentRecord`
 * now carries `items`, `total`, and `supplier` (PartyRef) for the detail UI.
 * Attachments are loaded in parallel and are non-critical: a failure leaves
 * the screen showing an empty list rather than an error state.
 */
@HiltViewModel
class PurchaseDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val api: ApiService,
    private val pdfShareService: PdfShareService,
    private val snackbar: AppSnackbarController,
    private val detailCache: DetailCache,
) : ViewModel() {

    private val _uiState = MutableStateFlow<PurchaseDetailUiState>(PurchaseDetailUiState.Loading)
    val uiState: StateFlow<PurchaseDetailUiState> = _uiState

    private val _isSharingPdf = MutableStateFlow(false)
    val isSharingPdf: StateFlow<Boolean> = _isSharingPdf.asStateFlow()

    private val _events = MutableSharedFlow<PurchaseDetailEvent>()
    val events: SharedFlow<PurchaseDetailEvent> = _events.asSharedFlow()

    private val documentId: String?

    init {
        documentId = savedStateHandle["id"]
        if (documentId.isNullOrBlank()) {
            _uiState.value = PurchaseDetailUiState.Failed(
                ApiException.Decoding(IllegalArgumentException("Missing document ID")),
            )
        } else {
            load()
        }
    }

    fun retry() {
        viewModelScope.launch { fetchDocument(useWarmCache = true) }
    }

    @Suppress("TooGenericExceptionCaught", "InstanceOfCheckForException")
    private suspend fun fetchDocument(useWarmCache: Boolean) {
        val id = documentId ?: return
        // Warm-start path: only honoured on first open of the screen (and on
        // user-initiated retry). Mutation handlers invalidate the cache and
        // bypass this branch so users never see a stale doc for a frame.
        val cached = if (useWarmCache) detailCache.getDocument(id) else null
        _uiState.value = if (cached != null) {
            PurchaseDetailUiState.Loaded(cached)
        } else {
            PurchaseDetailUiState.Loading
        }
        try {
            coroutineScope {
                val docDeferred = async { api.getDocument(DOCUMENT_TYPE, id) }
                val attDeferred = async {
                    runCatching { api.listAttachments(DOCUMENT_TYPE, id).attachments }
                        .getOrElse { emptyList() }
                }
                val document = docDeferred.await()
                val attachments = attDeferred.await()
                detailCache.putDocument(id, document)
                _uiState.value = PurchaseDetailUiState.Loaded(document, attachments)
            }
        } catch (e: Exception) {
            if (e is kotlinx.coroutines.CancellationException) throw e
            _uiState.value = PurchaseDetailUiState.Failed(e.toApiException())
        }
    }

    private fun load() {
        viewModelScope.launch { fetchDocument(useWarmCache = true) }
    }

    /**
     * Forces a fresh fetch by ejecting the cached entry first. Used after a
     * mutation (post / unpost / deleteAttachment) so the next render goes
     * `Loading` → `Loaded(fresh)` without flashing the stale cached state.
     */
    private fun reload() {
        val id = documentId ?: return
        detailCache.invalidateDocument(id)
        viewModelScope.launch { fetchDocument(useWarmCache = false) }
    }

    /**
     * Soft-deletes an attachment and reloads the document + attachment list.
     * Failures surface via the global snackbar.
     */
    fun deleteAttachment(attachmentId: String) {
        viewModelScope.launch {
            runCatching { api.deleteAttachment(attachmentId) }
                .onSuccess { reload() }
                .onFailure { snackbar.showRes(SharedR.string.error_unknown) }
        }
    }

    /**
     * Posts the current draft document and reloads the full record on success.
     * Emits [PurchaseDetailEvent.Posted] after reload, or [PurchaseDetailEvent.Error] on failure.
     */
    fun post() {
        val id = documentId ?: return
        viewModelScope.launch {
            runCatching { api.postDocument(DOCUMENT_TYPE, id) }
                .onSuccess {
                    reload()
                    _events.emit(PurchaseDetailEvent.Posted)
                }
                .onFailure { _events.emit(PurchaseDetailEvent.Error(it.message ?: "Post failed")) }
        }
    }

    /**
     * Reverses the posting of the current document and reloads the full record on success.
     * Emits [PurchaseDetailEvent.Unposted] after reload, or [PurchaseDetailEvent.Error] on failure.
     */
    fun unpost() {
        val id = documentId ?: return
        viewModelScope.launch {
            runCatching { api.unpostDocument(DOCUMENT_TYPE, id) }
                .onSuccess {
                    reload()
                    _events.emit(PurchaseDetailEvent.Unposted)
                }
                .onFailure { _events.emit(PurchaseDetailEvent.Error(it.message ?: "Un-post failed")) }
        }
    }

    /**
     * Creates a deep copy of the current document via the clone endpoint and
     * emits [PurchaseDetailEvent.ClonedTo] with the new document id on success,
     * or [PurchaseDetailEvent.Error] on failure.
     */
    fun clone() {
        val id = documentId ?: return
        viewModelScope.launch {
            runCatching {
                api.cloneDocument(DOCUMENT_TYPE, id, UUID.randomUUID().toString())
            }
                .onSuccess { _events.emit(PurchaseDetailEvent.ClonedTo(it.id)) }
                .onFailure { _events.emit(PurchaseDetailEvent.Error(it.message ?: "Clone failed")) }
        }
    }

    /**
     * Downloads the server PDF for the currently loaded purchase invoice and
     * opens the Android share chooser. Failures surface via the global
     * snackbar so the action bar feedback is consistent with sales detail.
     */
    fun sharePdf(chooserTitle: String) {
        val loaded = (_uiState.value as? PurchaseDetailUiState.Loaded) ?: return
        if (_isSharingPdf.value) return
        _isSharingPdf.update { true }
        viewModelScope.launch {
            val result = pdfShareService.fetchAndShare(
                docType = DOCUMENT_TYPE,
                docId = loaded.document.id,
                documentNumber = loaded.document.number,
                chooserTitle = chooserTitle,
            )
            if (result.isFailure) {
                snackbar.showRes(SharedR.string.share_pdf_failed)
            }
            _isSharingPdf.update { false }
        }
    }
}
