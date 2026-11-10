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

private const val WAREHOUSE_ENTITY_SLUG = "inventory.warehouse"

sealed class WarehousePickerUiState {
    data object Loading : WarehousePickerUiState()
    data class Loaded(val warehouses: List<CatalogRecord>, val query: String) : WarehousePickerUiState()
    data class Failed(val message: String) : WarehousePickerUiState()
}

@HiltViewModel
class WarehousePickerViewModel @Inject constructor(private val repo: CatalogRepository) : ViewModel() {

    private val _uiState = MutableStateFlow<WarehousePickerUiState>(WarehousePickerUiState.Loading)
    val uiState: StateFlow<WarehousePickerUiState> = _uiState

    private var allWarehouses: List<CatalogRecord> = emptyList()

    init {
        viewModelScope.launch {
            repo.observe(WAREHOUSE_ENTITY_SLUG).collect { records ->
                allWarehouses = records
                val currentState = _uiState.value
                val query = if (currentState is WarehousePickerUiState.Loaded) currentState.query else ""
                _uiState.value = WarehousePickerUiState.Loaded(
                    warehouses = filter(records, query),
                    query = query,
                )
            }
        }
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            runCatching { repo.refresh(WAREHOUSE_ENTITY_SLUG) }
                .onFailure { /* keep cached state */ }
        }
    }

    fun search(query: String) {
        val currentState = _uiState.value
        if (currentState is WarehousePickerUiState.Loaded) {
            _uiState.value = WarehousePickerUiState.Loaded(
                warehouses = filter(allWarehouses, query),
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
