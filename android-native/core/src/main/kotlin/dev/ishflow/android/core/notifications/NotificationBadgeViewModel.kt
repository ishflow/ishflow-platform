package dev.ishflow.android.core.notifications

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.core.db.PendingMutationDao
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

/**
 * Drives the top-bar bell badge: one count per open sync error plus a single
 * bump while anything is still waiting to sync offline. Mirrors the iOS
 * `MainTabView.refreshNotifBadge` formula so both platforms read the same.
 */
@HiltViewModel
class NotificationBadgeViewModel @Inject constructor(
    pendingDao: PendingMutationDao,
) : ViewModel() {

    val count: StateFlow<Int> = combine(
        pendingDao.observePending(),
        pendingDao.observeFailed(),
    ) { pending, failed ->
        failed.size + if (pending.isEmpty()) 0 else 1
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS),
        initialValue = 0,
    )

    private companion object {
        const val STOP_TIMEOUT_MS = 5_000L
    }
}
