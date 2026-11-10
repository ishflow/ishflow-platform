package dev.ishflow.android.feature.sales

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.api.ApiException
import dev.ishflow.android.appshared.api.toApiException
import dev.ishflow.android.appshared.models.DocumentRecord
import dev.ishflow.android.core.RefreshTrigger
import dev.ishflow.android.core.rbac.Permissions
import dev.ishflow.android.core.session.SessionStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class SalesListUiState {
    data object Loading : SalesListUiState()
    data class Loaded(val documents: List<DocumentRecord>, val query: String) : SalesListUiState()
    data class Failed(val exception: ApiException) : SalesListUiState()
}

@HiltViewModel
class SalesListViewModel @Inject constructor(
    private val api: ApiService,
    private val refreshTrigger: RefreshTrigger,
    sessionStore: SessionStore,
) : ViewModel() {

    private val _uiState = MutableStateFlow<SalesListUiState>(SalesListUiState.Loading)
    val uiState: StateFlow<SalesListUiState> = _uiState

    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing

    /**
     * Whether the current session may create a `sales.invoice`. Empty
     * grants → fail-open, so the FAB stays visible during rollout.
     */
    val canCreate: StateFlow<Boolean> = sessionStore.me
        .map { Permissions.has(it?.permissions?.toSet() ?: emptySet(), CREATE_INVOICE_PERMISSION) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), true)

    init {
        viewModelScope.launch {
            refreshTrigger.events.collect { refresh() }
        }
        refresh()
    }

    @Suppress("TooGenericExceptionCaught", "InstanceOfCheckForException")
    fun refresh() {
        viewModelScope.launch {
            _refreshing.value = true
            if (_uiState.value !is SalesListUiState.Loaded) {
                _uiState.value = SalesListUiState.Loading
            }
            try {
                val response = api.listDocuments("sales.invoice")
                _uiState.value = SalesListUiState.Loaded(
                    documents = response.items,
                    query = "",
                )
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                if (_uiState.value !is SalesListUiState.Loaded) {
                    _uiState.value = SalesListUiState.Failed(e.toApiException())
                }
            } finally {
                _refreshing.value = false
            }
        }
    }

    private companion object {
        const val CREATE_INVOICE_PERMISSION = "sales.invoice:create"
        const val STOP_TIMEOUT_MS = 5_000L
    }

    @Suppress("TooGenericExceptionCaught", "InstanceOfCheckForException")
    fun search(query: String) {
        viewModelScope.launch {
            val currentState = _uiState.value
            if (currentState is SalesListUiState.Loaded) {
                _uiState.value = SalesListUiState.Loaded(
                    documents = currentState.documents,
                    query = query,
                )
            }
            try {
                val response = api.listDocuments("sales.invoice", query = query.ifEmpty { null })
                _uiState.value = SalesListUiState.Loaded(
                    documents = response.items,
                    query = query,
                )
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                _uiState.value = SalesListUiState.Failed(e.toApiException())
            }
        }
    }
}
