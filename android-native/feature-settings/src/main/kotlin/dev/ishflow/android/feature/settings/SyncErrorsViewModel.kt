package dev.ishflow.android.feature.settings

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

@HiltViewModel
class SyncErrorsViewModel @Inject constructor(private val dao: PendingMutationDao, private val syncQueue: SyncQueue) :
    ViewModel() {

    val items: StateFlow<List<PendingMutationEntity>> = dao.observeFailed()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun retry(id: String) = viewModelScope.launch { syncQueue.retry(id) }

    fun dismiss(id: String) = viewModelScope.launch { dao.delete(id) }
}
