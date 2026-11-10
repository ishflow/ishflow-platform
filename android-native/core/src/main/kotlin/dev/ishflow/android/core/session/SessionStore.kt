package dev.ishflow.android.core.session

import dev.ishflow.android.appshared.models.MeResponse
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * In-memory cache of the current user's `/api/mobile/me` response.
 *
 * ViewModels inject [SessionStore] instead of refetching `/me`. The store
 * is populated by [TenantSwitchViewModel] on tenant switch; future work
 * may eagerly populate it during sign-in. Until that lands, [me] is
 * `null` on first composition — consumers must handle that path.
 */
@Singleton
class SessionStore @Inject constructor() {
    private val _tenantId = MutableStateFlow<String?>(null)
    val tenantId: StateFlow<String?> = _tenantId.asStateFlow()

    private val _me = MutableStateFlow<MeResponse?>(null)
    val me: StateFlow<MeResponse?> = _me.asStateFlow()

    /** Snapshot of granted permission strings for synchronous reads. */
    val permissions: Set<String>
        get() = _me.value?.permissions?.toSet() ?: emptySet()

    fun update(me: MeResponse) {
        _me.value = me
        _tenantId.value = me.tenant?.id
    }

    fun clear() {
        _me.value = null
        _tenantId.value = null
    }
}
