package dev.ishflow.android.feature.reports

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.api.ApiException
import dev.ishflow.android.appshared.api.toApiException
import dev.ishflow.android.appshared.models.ArAging
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class ArAgingUiState {
    data object Loading : ArAgingUiState()
    data class Loaded(val data: ArAging) : ArAgingUiState()
    data class Failed(val exception: ApiException) : ArAgingUiState()
}

@HiltViewModel
class ArAgingViewModel @Inject constructor(
    internal val api: ApiService,
) : ViewModel() {

    private val _uiState = MutableStateFlow<ArAgingUiState>(ArAgingUiState.Loading)
    val uiState: StateFlow<ArAgingUiState> = _uiState

    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing

    init {
        load()
    }

    fun refresh() {
        load()
    }

    @Suppress("TooGenericExceptionCaught", "InstanceOfCheckForException")
    private fun load() {
        viewModelScope.launch {
            _refreshing.value = true
            if (_uiState.value !is ArAgingUiState.Loaded) {
                _uiState.value = ArAgingUiState.Loading
            }
            try {
                val data = api.arAging()
                _uiState.value = ArAgingUiState.Loaded(data)
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                if (_uiState.value !is ArAgingUiState.Loaded) {
                    _uiState.value = ArAgingUiState.Failed(e.toApiException())
                }
            } finally {
                _refreshing.value = false
            }
        }
    }
}
