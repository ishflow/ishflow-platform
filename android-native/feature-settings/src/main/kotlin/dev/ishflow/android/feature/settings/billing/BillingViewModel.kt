package dev.ishflow.android.feature.settings.billing

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.appshared.models.BillingResponse
import dev.ishflow.android.apiclient.ApiService
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface BillingUiState {
    data object Loading : BillingUiState
    data class Loaded(val billing: BillingResponse) : BillingUiState
    data class Failed(val message: String) : BillingUiState
}

sealed interface BillingEvent {
    data class OpenPortal(val url: String) : BillingEvent
    data class Error(val message: String) : BillingEvent
}

@HiltViewModel
class BillingViewModel @Inject constructor(
    private val api: ApiService,
) : ViewModel() {

    private val _uiState = MutableStateFlow<BillingUiState>(BillingUiState.Loading)
    val uiState: StateFlow<BillingUiState> = _uiState.asStateFlow()

    private val _events = MutableSharedFlow<BillingEvent>()
    val events: SharedFlow<BillingEvent> = _events.asSharedFlow()

    init {
        refresh()
    }

    fun refresh() {
        _uiState.value = BillingUiState.Loading
        viewModelScope.launch {
            runCatching { api.getBilling() }
                .onSuccess { _uiState.value = BillingUiState.Loaded(it) }
                .onFailure { _uiState.value = BillingUiState.Failed(it.message.orEmpty()) }
        }
    }

    fun openPortal() {
        viewModelScope.launch {
            runCatching { api.createBillingPortalSession() }
                .onSuccess { _events.emit(BillingEvent.OpenPortal(it.url)) }
                .onFailure { _events.emit(BillingEvent.Error(it.message.orEmpty())) }
        }
    }
}
