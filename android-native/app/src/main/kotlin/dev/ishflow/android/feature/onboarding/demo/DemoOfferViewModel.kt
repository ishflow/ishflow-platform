package dev.ishflow.android.feature.onboarding.demo

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.SeedDemoRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DemoOfferViewModel @Inject constructor(
    private val api: ApiService,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {

    private val tenantId: String = checkNotNull(savedStateHandle["tenantId"])

    private val _uiState = MutableStateFlow<DemoOfferUiState>(DemoOfferUiState.Idle)
    val uiState: StateFlow<DemoOfferUiState> = _uiState.asStateFlow()

    fun seed() {
        _uiState.value = DemoOfferUiState.Seeding
        viewModelScope.launch {
            runCatching { api.seedDemoData(SeedDemoRequest(tenantId = tenantId)) }
                .onSuccess { _uiState.value = DemoOfferUiState.Success }
                .onFailure { _uiState.value = DemoOfferUiState.Error(it.message.orEmpty()) }
        }
    }

    fun skip() {
        _uiState.value = DemoOfferUiState.Skipped
    }
}

sealed interface DemoOfferUiState {
    data object Idle : DemoOfferUiState
    data object Seeding : DemoOfferUiState
    data object Success : DemoOfferUiState
    data object Skipped : DemoOfferUiState
    data class Error(val message: String) : DemoOfferUiState
}
