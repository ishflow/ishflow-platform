package dev.ishflow.android.feature.docs

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.api.ApiException
import dev.ishflow.android.appshared.api.toApiException
import dev.ishflow.android.appshared.models.DocumentRecord
import dev.ishflow.android.core.RefreshTrigger
import dev.ishflow.android.feature.docs.filter.DocsFilterState
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

private const val DOCS_PAGE_SIZE = 50

@HiltViewModel
class DocsListViewModel @Inject constructor(
    private val api: ApiService,
    private val refreshTrigger: RefreshTrigger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<DocsListUiState>(DocsListUiState.Loading)
    val uiState: StateFlow<DocsListUiState> = _uiState

    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing

    private val _filter = MutableStateFlow<DocsFilter>(DocsFilter.All)
    val filter: StateFlow<DocsFilter> = _filter

    private val _advancedFilter = MutableStateFlow(DocsFilterState())
    val advancedFilter: StateFlow<DocsFilterState> = _advancedFilter

    /**
     * Inline search query for the V1 refined-rows list. Filters the already-loaded
     * `state.rows` client-side; no network reload, so toggling it back and forth
     * never costs an extra API hit.
     */
    private val _query = MutableStateFlow("")
    val query: StateFlow<String> = _query

    fun setQuery(next: String) {
        _query.value = next
    }

    /** Monotonic token; only the latest load is allowed to publish state. */
    private var loadToken: Long = 0L

    init {
        viewModelScope.launch {
            refreshTrigger.events.collect { load() }
        }
        load()
    }

    fun selectFilter(next: DocsFilter) {
        if (_filter.value == next) return
        _filter.value = next
        load()
    }

    fun applyAdvancedFilter(state: DocsFilterState) {
        _advancedFilter.value = state
        load()
    }

    fun clearAdvancedFilter() {
        applyAdvancedFilter(DocsFilterState())
    }

    fun refresh() = load()

    private fun load() {
        val token = ++loadToken
        viewModelScope.launch {
            _refreshing.value = true
            _uiState.value = DocsListUiState.Loading
            val outcome = fetchAll(_filter.value, _advancedFilter.value)
            if (token != loadToken) return@launch
            _uiState.value = outcome
            _refreshing.value = false
        }
    }

    private suspend fun fetchAll(
        filter: DocsFilter,
        advanced: DocsFilterState,
    ): DocsListUiState {
        val results = runFanOut(filter.kinds)
        val anyOk = results.any { it.exceptionOrNull() == null }
        if (!anyOk) {
            val failure = results.firstNotNullOfOrNull { it.exceptionOrNull() }
            return DocsListUiState.Failed(failure.toDocsApiException())
        }
        val rows = results.flatMap { it.getOrNull().orEmpty() }
            .sortedByDescending { it.date }
        val filteredRows = advanced.apply(rows)
        return DocsListUiState.Loaded(rows = filteredRows, filter = filter)
    }

    @Suppress("TooGenericExceptionCaught", "InstanceOfCheckForException")
    private suspend fun runFanOut(kinds: List<DocumentKind>): List<Result<List<DocumentSummary>>> =
        coroutineScope {
            kinds.map { kind ->
                async {
                    try {
                        val response = api.listDocuments(kind.wireId, pageSize = DOCS_PAGE_SIZE)
                        Result.success(response.items.toSummaries(kind))
                    } catch (e: Exception) {
                        if (e is kotlinx.coroutines.CancellationException) throw e
                        Result.failure(e)
                    }
                }
            }.awaitAll()
        }

    private fun List<DocumentRecord>.toSummaries(kind: DocumentKind): List<DocumentSummary> =
        map { DocumentSummary.from(it, kind) }
}

private fun Throwable?.toDocsApiException(): ApiException = when (this) {
    null -> ApiException.Network(IllegalStateException("unknown"))
    is ApiException -> this
    else -> toApiException()
}
