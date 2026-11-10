package dev.ishflow.android.feature.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.core.db.PushNotificationDao
import dev.ishflow.android.core.db.PushNotificationEntity
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class NotificationsInboxViewModel @Inject constructor(private val dao: PushNotificationDao) : ViewModel() {

    val items: StateFlow<List<PushNotificationEntity>> = dao.observe()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun markRead(id: String) = viewModelScope.launch { dao.markRead(id) }

    fun clearAll() = viewModelScope.launch { dao.clear() }
}
