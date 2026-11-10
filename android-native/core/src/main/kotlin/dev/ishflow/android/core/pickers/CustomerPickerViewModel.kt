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

private const val CUSTOMER_ENTITY_SLUG = "sales.customer"

sealed class CustomerPickerUiState {
    data object Loading : CustomerPickerUiState()
    data class Loaded(val customers: List<CatalogRecord>, val query: String) : CustomerPickerUiState()
    data class Failed(val message: String) : CustomerPickerUiState()
}

@HiltViewModel
class CustomerPickerViewModel @Inject constructor(private val repo: CatalogRepository) : ViewModel() {

    private val _uiState = MutableStateFlow<CustomerPickerUiState>(CustomerPickerUiState.Loading)
    val uiState: StateFlow<CustomerPickerUiState> = _uiState

    private var allCustomers: List<CatalogRecord> = emptyList()

    init {
        viewModelScope.launch {
            repo.observe(CUSTOMER_ENTITY_SLUG).collect { records ->
                allCustomers = records
                val currentState = _uiState.value
                val query = if (currentState is CustomerPickerUiState.Loaded) currentState.query else ""
                _uiState.value = CustomerPickerUiState.Loaded(
                    customers = filter(records, query),
                    query = query,
                )
            }
        }
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            runCatching { repo.refresh(CUSTOMER_ENTITY_SLUG) }
                .onFailure { /* keep cached state */ }
        }
    }

    fun search(query: String) {
        val currentState = _uiState.value
        if (currentState is CustomerPickerUiState.Loaded) {
            _uiState.value = CustomerPickerUiState.Loaded(
                customers = filter(allCustomers, query),
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
