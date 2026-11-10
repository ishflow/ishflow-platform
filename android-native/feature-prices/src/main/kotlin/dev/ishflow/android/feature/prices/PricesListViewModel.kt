package dev.ishflow.android.feature.prices

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.appshared.api.ApiException
import dev.ishflow.android.appshared.api.toApiException
import dev.ishflow.android.appshared.models.CatalogRecord
import dev.ishflow.android.core.RefreshTrigger
import dev.ishflow.android.core.repository.CatalogRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class PricesListUiState {
    data object Loading : PricesListUiState()
    data class Loaded(val records: List<CatalogRecord>, val query: String) : PricesListUiState()
    data class Failed(val exception: ApiException) : PricesListUiState()
}

@HiltViewModel
class PricesListViewModel @Inject constructor(
    private val repo: CatalogRepository,
    private val refreshTrigger: RefreshTrigger,
) : ViewModel() {
    private val _uiState = MutableStateFlow<PricesListUiState>(PricesListUiState.Loading)
    val uiState: StateFlow<PricesListUiState> = _uiState

    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing

    init {
        viewModelScope.launch {
            repo.observe("prices.priceList").collect { records ->
                if (records.isEmpty() && _uiState.value !is PricesListUiState.Failed) {
                    _uiState.value = PricesListUiState.Loaded(records, query = "")
                } else if (records.isNotEmpty()) {
                    _uiState.value = PricesListUiState.Loaded(records, query = "")
                }
            }
        }
        viewModelScope.launch {
            refreshTrigger.events.collect { refresh() }
        }
        refresh()
    }

    @Suppress("TooGenericExceptionCaught", "InstanceOfCheckForException")
    fun refresh() {
        viewModelScope.launch {
            _refreshing.value = true
            runCatching { repo.refresh("prices.priceList") }
                .onFailure { e ->
                    if (e !is kotlinx.coroutines.CancellationException) {
                        if (_uiState.value !is PricesListUiState.Loaded) {
                            _uiState.value = PricesListUiState.Failed(e.toApiException())
                        }
                    }
                }
            _refreshing.value = false
        }
    }

    fun search(query: String) {
        val currentState = _uiState.value
        if (currentState is PricesListUiState.Loaded) {
            _uiState.value = PricesListUiState.Loaded(
                records = currentState.records,
                query = query,
            )
        }
    }
}
