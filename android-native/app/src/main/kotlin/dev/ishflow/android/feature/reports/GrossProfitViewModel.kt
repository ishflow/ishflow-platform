package dev.ishflow.android.feature.reports

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.api.ApiException
import dev.ishflow.android.appshared.api.toApiException
import dev.ishflow.android.appshared.models.GrossProfit
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class GrossProfitUiState {
    data object Loading : GrossProfitUiState()
    data class Loaded(val data: GrossProfit) : GrossProfitUiState()
    data class Failed(val exception: ApiException) : GrossProfitUiState()
}

@HiltViewModel
class GrossProfitViewModel @Inject constructor(
    internal val api: ApiService,
) : ViewModel() {

    private val _uiState = MutableStateFlow<GrossProfitUiState>(GrossProfitUiState.Loading)
    val uiState: StateFlow<GrossProfitUiState> = _uiState

    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing

    private val _preset = MutableStateFlow(ReportPeriodPreset.LAST_30_DAYS)
    val preset: StateFlow<ReportPeriodPreset> = _preset

    init {
        load()
    }

    fun selectPreset(value: ReportPeriodPreset) {
        if (_preset.value == value) return
        _preset.value = value
        load()
    }

    fun refresh() {
        load()
    }

    /** Returns (from, to) ISO-8601 strings for the currently selected preset. */
    fun currentPeriod(): Pair<String, String> {
        val (from, to) = _preset.value.resolve()
        return Pair(from.toString(), to.toString())
    }

    @Suppress("TooGenericExceptionCaught", "InstanceOfCheckForException")
    private fun load() {
        viewModelScope.launch {
            _refreshing.value = true
            if (_uiState.value !is GrossProfitUiState.Loaded) {
                _uiState.value = GrossProfitUiState.Loading
            }
            try {
                val (from, to) = _preset.value.resolve()
                val data = api.grossProfit(from.toString(), to.toString())
                _uiState.value = GrossProfitUiState.Loaded(data)
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                if (_uiState.value !is GrossProfitUiState.Loaded) {
                    _uiState.value = GrossProfitUiState.Failed(e.toApiException())
                }
            } finally {
                _refreshing.value = false
            }
        }
    }
}
