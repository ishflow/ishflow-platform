package dev.ishflow.android.feature.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.api.ApiException
import dev.ishflow.android.appshared.api.toApiException
import dev.ishflow.android.appshared.models.TenantSummary
import dev.ishflow.android.auth.TokenStore
import dev.ishflow.android.core.RefreshTrigger
import dev.ishflow.android.core.session.SessionStore
import dev.ishflow.android.core.ui.AppSnackbarController
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class TenantSwitchUiState {
    data object Loading : TenantSwitchUiState()
    data class Loaded(val current: TenantSummary?, val available: List<TenantSummary>) : TenantSwitchUiState()
    data object Switching : TenantSwitchUiState()
    data class Failed(val exception: ApiException) : TenantSwitchUiState()
}

@HiltViewModel
class TenantSwitchViewModel @Inject constructor(
    private val api: ApiService,
    private val session: SessionStore,
    private val refreshTrigger: RefreshTrigger,
    private val snackbarController: AppSnackbarController,
    private val tokenStore: TokenStore,
) : ViewModel() {

    private val _uiState = MutableStateFlow<TenantSwitchUiState>(TenantSwitchUiState.Loading)
    val uiState: StateFlow<TenantSwitchUiState> = _uiState

    // One-shot success signal so the screen can pop back to the dashboard
    // after the new bearer is wired up. CONFLATED so a rapid double-switch
    // collapses into a single navigation event instead of stacking pops.
    private val _switched = Channel<Unit>(capacity = Channel.CONFLATED)
    val switched: Flow<Unit> = _switched.receiveAsFlow()

    init {
        refresh()
    }

    @Suppress("TooGenericExceptionCaught", "InstanceOfCheckForException")
    fun refresh() {
        viewModelScope.launch {
            _uiState.value = TenantSwitchUiState.Loading
            try {
                val response = api.getMe()
                val current = response.tenant
                val available = response.tenants
                _uiState.value = TenantSwitchUiState.Loaded(current, available)
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                _uiState.value = TenantSwitchUiState.Failed(e.toApiException())
            }
        }
    }

    fun switch(tenantId: String) {
        viewModelScope.launch {
            _uiState.value = TenantSwitchUiState.Switching
            runCatching {
                // 1. Re-mint the bearer JWT first; the old token's `tid` claim
                //    points at the previous tenant and `resolveBearerContext`
                //    on the server reads JWT before Clerk publicMetadata.
                val tokenResponse = api.switchTenant(tenantId)
                tokenStore.setToken(tokenResponse.token)
                // 2. Now `/me` is authoritative for the new tenant.
                api.getMe()
            }
                .onSuccess { me ->
                    session.update(me)
                    refreshTrigger.fire(0L)
                    refresh()
                    val tenantName = me.tenant?.name.orEmpty()
                    snackbarController.showRes(R.string.tenant_switch_snackbar, tenantName)
                    _switched.trySend(Unit)
                }
                .onFailure {
                    _uiState.value = TenantSwitchUiState.Failed(it.toApiException())
                }
        }
    }
}
