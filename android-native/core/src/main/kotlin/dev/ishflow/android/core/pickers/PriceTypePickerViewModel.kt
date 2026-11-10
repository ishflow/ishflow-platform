package dev.ishflow.android.core.pickers

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.appshared.models.CatalogRecord
import dev.ishflow.android.core.repository.CatalogRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

private const val PRICE_TYPE_ENTITY_SLUG = "sales.price_type"

sealed class PriceTypePickerUiState {
    data object Loading : PriceTypePickerUiState()
    data class Loaded(val priceTypes: List<CatalogRecord>, val query: String) : PriceTypePickerUiState()
    data class Failed(val message: String) : PriceTypePickerUiState()
}

@HiltViewModel
class PriceTypePickerViewModel @Inject constructor(private val repo: CatalogRepository) : ViewModel() {

    private val _uiState = MutableStateFlow<PriceTypePickerUiState>(PriceTypePickerUiState.Loading)
    val uiState: StateFlow<PriceTypePickerUiState> = _uiState

    private var allPriceTypes: List<CatalogRecord> = emptyList()

    init {
        viewModelScope.launch {
            repo.observe(PRICE_TYPE_ENTITY_SLUG).collect { records ->
                allPriceTypes = records
                val currentState = _uiState.value
                val query = if (currentState is PriceTypePickerUiState.Loaded) currentState.query else ""
                _uiState.value = PriceTypePickerUiState.Loaded(
                    priceTypes = filter(records, query),
                    query = query,
                )
            }
        }
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            runCatching { repo.refresh(PRICE_TYPE_ENTITY_SLUG) }
                .onFailure { /* keep cached state */ }
        }
    }

    fun search(query: String) {
        val currentState = _uiState.value
        if (currentState is PriceTypePickerUiState.Loaded) {
            _uiState.value = PriceTypePickerUiState.Loaded(
                priceTypes = filter(allPriceTypes, query),
                query = query,
            )
        }
    }

    private fun filter(records: List<CatalogRecord>, query: String): List<CatalogRecord> {
        if (query.isBlank()) return records
        val lower = query.lowercase()
        return records.filter {
            it.name.lowercase().contains(lower) ||
                it.code?.lowercase()?.contains(lower) == true
        }
    }
}
