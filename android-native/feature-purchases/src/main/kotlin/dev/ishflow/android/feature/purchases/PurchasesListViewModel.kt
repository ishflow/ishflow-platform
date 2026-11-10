package dev.ishflow.android.feature.purchases

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

internal const val PURCHASE_INVOICE_KIND = "purchases.invoice"

sealed class PurchasesListUiState {
    data object Loading : PurchasesListUiState()
    data class Loaded(val documents: List<DocumentRecord>, val query: String) : PurchasesListUiState()
    data class Failed(val exception: ApiException) : PurchasesListUiState()
}

@HiltViewModel
class PurchasesListViewModel @Inject constructor(
    private val api: ApiService,
    private val refreshTrigger: RefreshTrigger,
    sessionStore: SessionStore,
) : ViewModel() {

    private val _uiState = MutableStateFlow<PurchasesListUiState>(PurchasesListUiState.Loading)
    val uiState: StateFlow<PurchasesListUiState> = _uiState

    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing

    /**
     * Whether the current session may create a `purchases.invoice`. Empty
     * grants → fail-open so the FAB remains visible during rollout.
     */
    val canCreate: StateFlow<Boolean> = sessionStore.me
        .map { Permissions.has(it?.permissions?.toSet() ?: emptySet(), CREATE_INVOICE_PERMISSION) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), true)

    private companion object {
        const val CREATE_INVOICE_PERMISSION = "purchases.invoice:create"
        const val STOP_TIMEOUT_MS = 5_000L
    }

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
            _uiState.value = PurchasesListUiState.Loading
            try {
                val response = api.listDocuments(PURCHASE_INVOICE_KIND)
                _uiState.value = PurchasesListUiState.Loaded(
                    documents = response.items,
                    query = "",
                )
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                _uiState.value = PurchasesListUiState.Failed(e.toApiException())
            } finally {
                _refreshing.value = false
            }
        }
    }

    @Suppress("TooGenericExceptionCaught", "InstanceOfCheckForException")
    fun search(query: String) {
        viewModelScope.launch {
            val currentState = _uiState.value
            if (currentState is PurchasesListUiState.Loaded) {
                _uiState.value = PurchasesListUiState.Loaded(
                    documents = currentState.documents,
                    query = query,
                )
            }
            try {
                val response = api.listDocuments(
                    type = PURCHASE_INVOICE_KIND,
                    query = query.ifEmpty { null },
                )
                _uiState.value = PurchasesListUiState.Loaded(
                    documents = response.items,
                    query = query,
                )
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                _uiState.value = PurchasesListUiState.Failed(e.toApiException())
            }
        }
    }
}
