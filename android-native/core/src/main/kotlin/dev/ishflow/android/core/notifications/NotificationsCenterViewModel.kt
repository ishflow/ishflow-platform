package dev.ishflow.android.core.notifications

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.core.db.PendingMutationDao
import dev.ishflow.android.core.db.PendingMutationEntity
import dev.ishflow.android.core.db.PushNotificationDao
import dev.ishflow.android.core.db.PushNotificationEntity
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

/**
 * State for [NotificationsCenterSheet] — three independent inbox sections
 * combined into one snapshot:
 *
 *  - [recent]: server push notifications (latest 10)
 *  - [outbox]: mutations queued but not yet sent (pending)
 *  - [errors]: mutations that exhausted retries (failed)
 *
 * Mirrors the iOS `NotificationsCenterSheet` 3-tab layout but presents them
 * stacked in a single sheet so users can scan all three sources without
 * paging.
 */
data class NotificationsCenterUiState(
    val recent: List<PushNotificationEntity>,
    val outbox: List<PendingMutationEntity>,
    val errors: List<PendingMutationEntity>,
) {
    companion object {
        val Empty = NotificationsCenterUiState(
            recent = emptyList(),
            outbox = emptyList(),
            errors = emptyList(),
        )
    }
}

@HiltViewModel
class NotificationsCenterViewModel @Inject constructor(
    pushDao: PushNotificationDao,
    pendingDao: PendingMutationDao,
) : ViewModel() {

    val state: StateFlow<NotificationsCenterUiState> = combine(
        pushDao.observe().map { it.take(MAX_RECENT) },
        pendingDao.observePending(),
        pendingDao.observeFailed().map { it.take(MAX_ERRORS) },
    ) { recent, outbox, errors ->
        NotificationsCenterUiState(recent = recent, outbox = outbox, errors = errors)
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS),
        initialValue = NotificationsCenterUiState.Empty,
    )

    private companion object {
        const val MAX_RECENT = 10
        const val MAX_ERRORS = 10
        const val STOP_TIMEOUT_MS = 5_000L
    }
}
