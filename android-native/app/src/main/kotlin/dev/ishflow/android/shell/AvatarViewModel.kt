package dev.ishflow.android.shell

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.appshared.models.MeResponse
import dev.ishflow.android.appshared.models.UserSummary
import dev.ishflow.android.core.session.SessionStore
import javax.inject.Inject
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn

/**
 * Derives a single-letter initial and the multi-tenant badge for
 * [AvatarButton] from [SessionStore].
 *
 * Lives in `:app` so we don't expose `SessionStore` to feature modules just
 * for avatar rendering.
 *
 * Initial priority: first-name initial → email initial → null (renders the
 * generic account glyph).
 *
 * Tenant badge: up to two letters of the active org name when the user has
 * access to two or more tenants. Null otherwise (single-tenant users have no
 * reason to switch).
 */
@HiltViewModel
class AvatarViewModel @Inject constructor(sessionStore: SessionStore) : ViewModel() {
    val initial: StateFlow<String?> = sessionStore.me
        .map { it?.user?.let(::initialFrom) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), null)

    val tenantBadge: StateFlow<String?> = sessionStore.me
        .map(::tenantBadgeFor)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), null)

    private companion object {
        const val STOP_TIMEOUT_MS = 5_000L
        const val MIN_TENANTS_FOR_BADGE = 2
    }

    private fun tenantBadgeFor(me: MeResponse?): String? {
        if (me == null) return null
        if (me.tenants.size < MIN_TENANTS_FOR_BADGE) return null
        return computeTenantInitials(me.tenant?.name)
    }
}

private fun initialFrom(user: UserSummary): String? {
    // Priority: firstName → lastName → email → user.id (always present).
    // Empty strings (Clerk OAuth profiles often have blank firstName) are
    // treated the same as null so we fall through; previously we bailed
    // to AccountCircle whenever firstName was blank AND email was blank.
    user.firstName?.trim()?.firstOrNull()?.let { return it.uppercase() }
    user.lastName?.trim()?.firstOrNull()?.let { return it.uppercase() }
    user.email.trim().firstOrNull { it.isLetterOrDigit() }?.let { return it.uppercase() }
    return user.id.trim().firstOrNull { it.isLetterOrDigit() }?.uppercase()
}
