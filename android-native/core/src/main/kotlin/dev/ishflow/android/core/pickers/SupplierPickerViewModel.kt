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

private const val SUPPLIER_ENTITY_SLUG = "purchases.supplier"

sealed class SupplierPickerUiState {
    data object Loading : SupplierPickerUiState()
    data class Loaded(val suppliers: List<CatalogRecord>, val query: String) : SupplierPickerUiState()
    data class Failed(val message: String) : SupplierPickerUiState()
}

@HiltViewModel
class SupplierPickerViewModel @Inject constructor(private val repo: CatalogRepository) : ViewModel() {

    private val _uiState = MutableStateFlow<SupplierPickerUiState>(SupplierPickerUiState.Loading)
    val uiState: StateFlow<SupplierPickerUiState> = _uiState

    private var allSuppliers: List<CatalogRecord> = emptyList()

    init {
        viewModelScope.launch {
            repo.observe(SUPPLIER_ENTITY_SLUG).collect { records ->
                allSuppliers = records
                val currentState = _uiState.value
                val query = if (currentState is SupplierPickerUiState.Loaded) currentState.query else ""
                _uiState.value = SupplierPickerUiState.Loaded(
                    suppliers = filter(records, query),
                    query = query,
                )
            }
        }
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            runCatching { repo.refresh(SUPPLIER_ENTITY_SLUG) }
                .onFailure { /* keep cached state */ }
        }
    }

    fun search(query: String) {
        val currentState = _uiState.value
        if (currentState is SupplierPickerUiState.Loaded) {
            _uiState.value = SupplierPickerUiState.Loaded(
                suppliers = filter(allSuppliers, query),
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
