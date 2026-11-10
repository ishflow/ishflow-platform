package dev.ishflow.android.feature.docs

import dev.ishflow.android.appshared.api.ApiException

sealed interface DocsListUiState {
    data object Loading : DocsListUiState

    data class Loaded(
        val rows: List<DocumentSummary>,
        val filter: DocsFilter,
    ) : DocsListUiState

    data class Failed(val exception: ApiException) : DocsListUiState
}
