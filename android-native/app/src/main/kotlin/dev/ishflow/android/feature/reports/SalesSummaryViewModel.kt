package dev.ishflow.android.feature.reports

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.api.ApiException
import dev.ishflow.android.appshared.api.toApiException
import dev.ishflow.android.appshared.models.SalesSummary
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class SalesSummaryUiState {
    data object Loading : SalesSummaryUiState()
    data class Loaded(val data: SalesSummary) : SalesSummaryUiState()
    data class Failed(val exception: ApiException) : SalesSummaryUiState()
}

@HiltViewModel
class SalesSummaryViewModel @Inject constructor(
    internal val api: ApiService,
) : ViewModel() {

    private val _uiState = MutableStateFlow<SalesSummaryUiState>(SalesSummaryUiState.Loading)
    val uiState: StateFlow<SalesSummaryUiState> = _uiState

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
            if (_uiState.value !is SalesSummaryUiState.Loaded) {
                _uiState.value = SalesSummaryUiState.Loading
            }
            try {
                val (from, to) = _preset.value.resolve()
                val data = api.salesSummary(from.toString(), to.toString())
                _uiState.value = SalesSummaryUiState.Loaded(data)
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                if (_uiState.value !is SalesSummaryUiState.Loaded) {
                    _uiState.value = SalesSummaryUiState.Failed(e.toApiException())
                }
            } finally {
                _refreshing.value = false
            }
        }
    }
}
