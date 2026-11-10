package dev.ishflow.android.shell

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.api.toApiException
import dev.ishflow.android.appshared.models.MeResponse
import dev.ishflow.android.appshared.models.TenantSummary
import dev.ishflow.android.appshared.ui.stringRes
import dev.ishflow.android.auth.TokenStore
import dev.ishflow.android.core.RefreshTrigger
import dev.ishflow.android.core.session.SessionStore
import dev.ishflow.android.core.ui.AppSnackbarController
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Bottom-sheet state for [OrgSwitcherSheet].
 *
 *  - [current] is the active tenant; null on the very first render before
 *    `/me` resolved.
 *  - [memberships] is every tenant the signed-in user belongs to. Empty
 *    means the user is mid-bootstrap.
 *  - [switching] toggles a single-tenant spinner while the API call is in
 *    flight so the user can't double-tap and double-switch.
 */
internal data class OrgSwitcherState(
    val current: TenantSummary? = null,
    val memberships: List<TenantSummary> = emptyList(),
    val switching: Boolean = false,
)

/**
 * Host-agnostic switcher ViewModel. Mirrors the network behaviour of
 * `TenantSwitchViewModel` (settings sub-screen) but exposes a single
 * combined state flow so the dashboard sheet can be driven from one
 * collector. The settings page keeps its own VM as the full-screen list
 * entry-point; this one only powers the dashboard's modal.
 */
@HiltViewModel
class OrgSwitcherViewModel @Inject constructor(
    private val api: ApiService,
    private val session: SessionStore,
    private val refreshTrigger: RefreshTrigger,
    private val snackbarController: AppSnackbarController,
    private val tokenStore: TokenStore,
) : ViewModel() {

    private val _switching = MutableStateFlow(false)

    internal val state: StateFlow<OrgSwitcherState> = combine(session.me, _switching) { me, switching ->
        OrgSwitcherState(
            current = me?.tenant,
            memberships = me?.tenants.orEmpty(),
            switching = switching,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), OrgSwitcherState())

    /**
     * Switches the active tenant. On success: updates [SessionStore], fires
     * a global refresh, emits the tenant-switch snackbar, and invokes
     * [onSuccess] so the host can dismiss the sheet. On failure: surfaces
     * the localized API error and keeps the sheet open for retry.
     */
    fun switch(tenantId: String, onSuccess: () -> Unit) {
        if (_switching.value) return
        viewModelScope.launch {
            _switching.value = true
            runCatching {
                // Re-mint bearer first — the previous JWT's `tid` claim still
                // points at the old tenant and `resolveBearerContext` reads
                // JWT before Clerk publicMetadata, so /me would otherwise
                // resolve to the previous tenant.
                val tokenResponse = api.switchTenant(tenantId)
                tokenStore.setToken(tokenResponse.token)
                api.getMe()
            }
                .onSuccess { me: MeResponse ->
                    session.update(me)
                    refreshTrigger.fire(0L)
                    val tenantName = me.tenant?.name.orEmpty()
                    snackbarController.showRes(
                        dev.ishflow.android.feature.settings.R.string.tenant_switch_snackbar,
                        tenantName,
                    )
                    onSuccess()
                }
                .onFailure { error ->
                    snackbarController.showRes(error.toApiException().stringRes())
                }
            _switching.value = false
        }
    }

    private companion object {
        const val STOP_TIMEOUT_MS = 5_000L
    }
}
