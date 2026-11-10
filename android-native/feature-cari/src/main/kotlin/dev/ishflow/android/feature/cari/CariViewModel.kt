package dev.ishflow.android.feature.cari

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.appshared.api.ApiException
import dev.ishflow.android.appshared.api.toApiException
import dev.ishflow.android.appshared.models.Counterparty
import dev.ishflow.android.core.RefreshTrigger
import dev.ishflow.android.core.rbac.Permissions
import dev.ishflow.android.core.session.SessionStore
import dev.ishflow.android.feature.cari.data.CariRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

/** Possible kinds of cari filter chip; mirrors `CariRepository.Kind`. */
enum class CariKind { All, Customer, Supplier }

/** Cari list UI state. */
sealed class CariUiState {
    data object Loading : CariUiState()
    data class Loaded(val items: List<Counterparty>, val kind: CariKind) : CariUiState()
    data class Failed(val exception: ApiException) : CariUiState()
}

@HiltViewModel
class CariViewModel @Inject constructor(
    private val repository: CariRepository,
    sessionStore: SessionStore,
    refreshTrigger: RefreshTrigger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<CariUiState>(CariUiState.Loading)
    val uiState: StateFlow<CariUiState> = _uiState

    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing

    /**
     * Whether Cari should be visible at all — requires read access to
     * either customers or suppliers. Empty grants → true (fail-open).
     */
    val canView: StateFlow<Boolean> = sessionStore.me
        .map {
            val granted = it?.permissions?.toSet() ?: emptySet()
            Permissions.any(granted, REQUIRED_READ_PERMS)
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), true)

    // Default to Customer — UI is a 2-tab filter (Customers / Suppliers);
    // `All` exists in the enum for repository/test parity but is not a
    // landing state.
    private var currentKind: CariKind = CariKind.Customer

    init {
        // Reload the active kind whenever the session changes tenants
        // (tenant switch fires the trigger). Without this, the previous
        // tenant's counterparties would linger after the user picks a new
        // org from the MoreSheet header.
        viewModelScope.launch {
            refreshTrigger.events.collect { load(currentKind) }
        }
        load(currentKind)
    }

    fun selectKind(kind: CariKind) {
        if (kind == currentKind && _uiState.value is CariUiState.Loaded) return
        currentKind = kind
        load(kind)
    }

    fun refresh() {
        load(currentKind)
    }

    @Suppress("TooGenericExceptionCaught", "InstanceOfCheckForException")
    private fun load(kind: CariKind) {
        viewModelScope.launch {
            _refreshing.value = true
            _uiState.value = CariUiState.Loading
            try {
                val items = repository.list(kind.toRepositoryKind())
                _uiState.value = CariUiState.Loaded(items = items, kind = kind)
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                _uiState.value = CariUiState.Failed(e.toApiException())
            } finally {
                _refreshing.value = false
            }
        }
    }

    private fun CariKind.toRepositoryKind(): CariRepository.Kind = when (this) {
        CariKind.All -> CariRepository.Kind.All
        CariKind.Customer -> CariRepository.Kind.Customer
        CariKind.Supplier -> CariRepository.Kind.Supplier
    }

    private companion object {
        val REQUIRED_READ_PERMS = listOf("sales.customer:read", "purchases.supplier:read")
        const val STOP_TIMEOUT_MS = 5_000L
    }
}
