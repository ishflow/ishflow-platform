package dev.ishflow.android.feature.prices

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.api.ApiException
import dev.ishflow.android.appshared.api.toApiException
import dev.ishflow.android.appshared.models.CatalogRecord
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class PriceDetailUiState {
    data object Loading : PriceDetailUiState()
    data class Loaded(val record: CatalogRecord) : PriceDetailUiState()
    data class Failed(val exception: ApiException) : PriceDetailUiState()
}

@HiltViewModel
class PriceDetailViewModel @Inject constructor(savedStateHandle: SavedStateHandle, private val api: ApiService) :
    ViewModel() {

    private val _uiState = MutableStateFlow<PriceDetailUiState>(PriceDetailUiState.Loading)
    val uiState: StateFlow<PriceDetailUiState> = _uiState

    private val priceId: String?

    init {
        priceId = savedStateHandle["id"]
        if (priceId != null) {
            load()
        } else {
            _uiState.value = PriceDetailUiState.Failed(
                ApiException.Decoding(IllegalArgumentException("Missing price ID")),
            )
        }
    }

    fun retry() {
        viewModelScope.launch { load() }
    }

    @Suppress("TooGenericExceptionCaught", "InstanceOfCheckForException")
    private fun load() {
        val id = priceId ?: return
        viewModelScope.launch {
            _uiState.value = PriceDetailUiState.Loading
            try {
                val response = api.listCatalog("prices.priceList")
                val record = response.items.find { it.id == id }
                if (record != null) {
                    _uiState.value = PriceDetailUiState.Loaded(record)
                } else {
                    _uiState.value = PriceDetailUiState.Failed(
                        ApiException.Http(status = 404, body = null),
                    )
                }
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                _uiState.value = PriceDetailUiState.Failed(e.toApiException())
            }
        }
    }
}
