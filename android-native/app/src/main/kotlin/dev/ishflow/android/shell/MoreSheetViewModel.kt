package dev.ishflow.android.shell

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.appshared.models.TenantSummary
import dev.ishflow.android.appshared.models.UserSummary
import dev.ishflow.android.core.session.SessionStore
import javax.inject.Inject
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn

/**
 * Exposes the active [TenantSummary] and the signed-in [UserSummary] for the
 * MoreSheet header card and Organisation row.
 *
 * Lives in `:app/shell` so feature modules don't depend on `SessionStore`
 * just to render the sheet. Mirrors the slim [AvatarViewModel] pattern.
 */
@HiltViewModel
class MoreSheetViewModel @Inject constructor(sessionStore: SessionStore) : ViewModel() {

    val currentTenant: StateFlow<TenantSummary?> = sessionStore.me
        .map { it?.tenant }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), null)

    val currentUser: StateFlow<UserSummary?> = sessionStore.me
        .map { it?.user }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), null)

    /**
     * Active user's permission set, surfaced for permission-gated rows
     * (e.g. Reports requires `reports:read` or a wildcard that covers it).
     * Empty when the session has no /me yet — gate consumers default to
     * hiding the row in that case.
     */
    val permissions: StateFlow<List<String>> = sessionStore.me
        .map { it?.permissions.orEmpty() }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), emptyList())

    private companion object {
        const val STOP_TIMEOUT_MS = 5_000L
    }
}
