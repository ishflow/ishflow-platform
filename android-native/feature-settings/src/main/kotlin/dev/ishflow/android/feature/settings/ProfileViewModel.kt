package dev.ishflow.android.feature.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.api.ApiException
import dev.ishflow.android.appshared.api.toApiException
import dev.ishflow.android.appshared.models.MeResponse
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class ProfileUiState {
    data object Loading : ProfileUiState()
    data class Loaded(val me: MeResponse) : ProfileUiState()
    data class Failed(val exception: ApiException) : ProfileUiState()
}

@HiltViewModel
class ProfileViewModel @Inject constructor(private val api: ApiService) : ViewModel() {

    private val _uiState = MutableStateFlow<ProfileUiState>(ProfileUiState.Loading)
    val uiState: StateFlow<ProfileUiState> = _uiState

    init {
        refresh()
    }

    @Suppress("TooGenericExceptionCaught", "InstanceOfCheckForException")
    fun refresh() {
        viewModelScope.launch {
            _uiState.value = ProfileUiState.Loading
            try {
                val response = api.getMe()
                _uiState.value = ProfileUiState.Loaded(response)
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                _uiState.value = ProfileUiState.Failed(e.toApiException())
            }
        }
    }
}
