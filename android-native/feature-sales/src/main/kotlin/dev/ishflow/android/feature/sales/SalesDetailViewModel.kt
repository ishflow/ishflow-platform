package dev.ishflow.android.feature.sales

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

private const val DOCUMENT_TYPE = "sales.invoice"

sealed interface SalesDetailEvent {
    data class ClonedTo(val id: String) : SalesDetailEvent
    data object Posted : SalesDetailEvent
    data object Unposted : SalesDetailEvent
    data class Error(val message: String) : SalesDetailEvent
}

sealed class SalesDetailUiState {
    data object Loading : SalesDetailUiState()
    data class Loaded(
        val document: DocumentRecord,
        val attachments: List<AttachmentRecord> = emptyList(),
    ) : SalesDetailUiState()
    data class Failed(val exception: ApiException) : SalesDetailUiState()
}

@HiltViewModel
class SalesDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val api: ApiService,
    private val pdfShareService: PdfShareService,
    private val snackbar: AppSnackbarController,
    private val detailCache: DetailCache,
) : ViewModel() {

    private val _uiState = MutableStateFlow<SalesDetailUiState>(SalesDetailUiState.Loading)
    val uiState: StateFlow<SalesDetailUiState> = _uiState

    private val _isSharingPdf = MutableStateFlow(false)
    val isSharingPdf: StateFlow<Boolean> = _isSharingPdf.asStateFlow()

    private val _events = MutableSharedFlow<SalesDetailEvent>()
    val events: SharedFlow<SalesDetailEvent> = _events.asSharedFlow()

    private val documentId: String? = savedStateHandle["id"]

    init {
        if (documentId != null) {
            load()
        } else {
            _uiState.value = SalesDetailUiState.Failed(
                ApiException.Decoding(IllegalArgumentException("Missing document ID")),
            )
        }
    }

    /** Initial open of the screen: warm-start from the cache if a fresh entry exists. */
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

    @Suppress("TooGenericExceptionCaught", "InstanceOfCheckForException")
    private suspend fun fetchDocument(useWarmCache: Boolean) {
        val id = documentId ?: return
        // Warm-start path: only honoured on first open of the screen. Mutation
        // handlers invalidate the cache and bypass this branch so users never
        // see the pre-mutation document for a frame.
        val cached = if (useWarmCache) detailCache.getDocument(id) else null
        _uiState.value = if (cached != null) {
            SalesDetailUiState.Loaded(cached)
        } else {
            SalesDetailUiState.Loading
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
                _uiState.value = SalesDetailUiState.Loaded(document, attachments)
            }
        } catch (e: Exception) {
            if (e is kotlinx.coroutines.CancellationException) throw e
            _uiState.value = SalesDetailUiState.Failed(e.toApiException())
        }
    }

    /**
     * Soft-deletes an attachment and reloads the document + attachment list.
     * Failures surface via the global snackbar.
     */
    fun deleteAttachment(attachmentId: String) {
        if (documentId == null) return
        viewModelScope.launch {
            runCatching { api.deleteAttachment(attachmentId) }
                .onSuccess { reload() }
                .onFailure { snackbar.showRes(SharedR.string.error_unknown) }
        }
    }

    /**
     * Creates a deep copy of the current document via the clone endpoint and
     * emits [SalesDetailEvent.ClonedTo] with the new document id on success,
     * or [SalesDetailEvent.Error] on failure.
     */
    fun clone() {
        val id = documentId ?: return
        viewModelScope.launch {
            runCatching {
                api.cloneDocument(DOCUMENT_TYPE, id, UUID.randomUUID().toString())
            }
                .onSuccess { _events.emit(SalesDetailEvent.ClonedTo(it.id)) }
                .onFailure { _events.emit(SalesDetailEvent.Error(it.message ?: "Clone failed")) }
        }
    }

    /**
     * Posts the current draft document and reloads the full record on success.
     * Emits [SalesDetailEvent.Posted] after reload, or [SalesDetailEvent.Error] on failure.
     */
    fun post() {
        val id = documentId ?: return
        viewModelScope.launch {
            runCatching { api.postDocument(DOCUMENT_TYPE, id) }
                .onSuccess {
                    reload()
                    _events.emit(SalesDetailEvent.Posted)
                }
                .onFailure { _events.emit(SalesDetailEvent.Error(it.message ?: "Post failed")) }
        }
    }

    /**
     * Reverses the posting of the current document and reloads the full record on success.
     * Emits [SalesDetailEvent.Unposted] after reload, or [SalesDetailEvent.Error] on failure.
     */
    fun unpost() {
        val id = documentId ?: return
        viewModelScope.launch {
            runCatching { api.unpostDocument(DOCUMENT_TYPE, id) }
                .onSuccess {
                    reload()
                    _events.emit(SalesDetailEvent.Unposted)
                }
                .onFailure { _events.emit(SalesDetailEvent.Error(it.message ?: "Un-post failed")) }
        }
    }

    /**
     * Downloads the server PDF for the currently loaded invoice and opens the
     * Android share chooser. Shows a snackbar on failure; iOS-style silent
     * success on the happy path (chooser is its own feedback).
     */
    fun sharePdf(chooserTitle: String) {
        val loaded = (_uiState.value as? SalesDetailUiState.Loaded) ?: return
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
