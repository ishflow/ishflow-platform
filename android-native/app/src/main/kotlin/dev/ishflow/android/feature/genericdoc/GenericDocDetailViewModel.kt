package dev.ishflow.android.feature.genericdoc

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.api.ApiException
import dev.ishflow.android.appshared.api.toApiException
import dev.ishflow.android.appshared.models.AttachmentRecord
import dev.ishflow.android.appshared.models.DocumentRecord
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class GenericDocDetailUiState {
    data object Loading : GenericDocDetailUiState()
    data class Loaded(
        val document: DocumentRecord,
        val attachments: List<AttachmentRecord> = emptyList(),
    ) : GenericDocDetailUiState()
    data class Failed(val exception: ApiException) : GenericDocDetailUiState()
}

/**
 * Generic document detail VM. The route declares `{module}/{name}/{id}` so the
 * dot-separated wire id (`sales.payment_received`) survives Compose Nav path
 * matching — we recombine `module.name` here.
 */
@HiltViewModel
class GenericDocDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val api: ApiService,
) : ViewModel() {

    private val module: String = savedStateHandle.get<String>("module").orEmpty()
    private val name: String = savedStateHandle.get<String>("name").orEmpty()
    private val docId: String = savedStateHandle.get<String>("id").orEmpty()

    val type: String = if (module.isNotEmpty() && name.isNotEmpty()) "$module.$name" else ""

    private val _uiState = MutableStateFlow<GenericDocDetailUiState>(GenericDocDetailUiState.Loading)
    val uiState: StateFlow<GenericDocDetailUiState> = _uiState

    init {
        if (type.isEmpty() || docId.isEmpty()) {
            _uiState.value = GenericDocDetailUiState.Failed(
                ApiException.Decoding(IllegalArgumentException("Missing document type or id")),
            )
        } else {
            load()
        }
    }

    fun retry() {
        if (type.isNotEmpty() && docId.isNotEmpty()) load()
    }

    @Suppress("TooGenericExceptionCaught", "InstanceOfCheckForException")
    private fun load() {
        viewModelScope.launch {
            _uiState.value = GenericDocDetailUiState.Loading
            try {
                coroutineScope {
                    val docDeferred = async { api.getDocument(type, docId) }
                    val attDeferred = async {
                        runCatching { api.listAttachments(type, docId).attachments }
                            .getOrElse { emptyList() }
                    }
                    val document = docDeferred.await()
                    val attachments = attDeferred.await()
                    _uiState.value = GenericDocDetailUiState.Loaded(document, attachments)
                }
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                _uiState.value = GenericDocDetailUiState.Failed(e.toApiException())
            }
        }
    }

    fun deleteAttachment(attachmentId: String) {
        viewModelScope.launch {
            runCatching { api.deleteAttachment(attachmentId) }
                .onSuccess { load() }
        }
    }
}
