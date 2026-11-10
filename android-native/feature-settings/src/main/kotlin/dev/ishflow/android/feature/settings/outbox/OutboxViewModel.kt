package dev.ishflow.android.feature.settings.outbox

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.core.SyncQueue
import dev.ishflow.android.core.db.PendingMutationDao
import dev.ishflow.android.core.db.PendingMutationEntity
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Backs the outbox screen: streams still-pending mutations and forwards
 * single-row + retry-all actions to [SyncQueue.retry].
 *
 * Mirrors iOS `OutboxQueueSheet` — exposes pending mutations only;
 * failed/exhausted ones live in the existing Sync Errors screen.
 */
@HiltViewModel
class OutboxViewModel @Inject constructor(
    private val syncQueue: SyncQueue,
    pendingDao: PendingMutationDao,
) : ViewModel() {

    val pending: StateFlow<List<PendingMutationEntity>> = pendingDao.observePending()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), emptyList())

    fun retry(id: String) {
        viewModelScope.launch { syncQueue.retry(id) }
    }

    fun retryAll() {
        viewModelScope.launch {
            pending.value.forEach { syncQueue.retry(it.id) }
        }
    }

    private companion object {
        const val STOP_TIMEOUT_MS = 5_000L
    }
}
