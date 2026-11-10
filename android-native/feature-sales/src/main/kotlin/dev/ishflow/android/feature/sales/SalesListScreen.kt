package dev.ishflow.android.feature.sales

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DockedSearchBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.ishflow.android.appshared.ui.DocumentRow
import dev.ishflow.android.appshared.ui.EmptyState
import dev.ishflow.android.appshared.ui.ErrorState
import dev.ishflow.android.appshared.ui.PullRefreshHost
import dev.ishflow.android.appshared.ui.stringRes
import dev.ishflow.android.feature.sales.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SalesListScreen(
    onDocumentClick: (String) -> Unit,
    onNewInvoice: () -> Unit,
    viewModel: SalesListViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val isRefreshing by viewModel.refreshing.collectAsStateWithLifecycle()
    val canCreate by viewModel.canCreate.collectAsStateWithLifecycle()

    SalesListScreenContent(
        uiState = uiState,
        isRefreshing = isRefreshing,
        canCreate = canCreate,
        onRefresh = viewModel::refresh,
        onDocumentClick = onDocumentClick,
        onNewInvoice = onNewInvoice,
        onSearch = viewModel::search,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
@Suppress("LongMethod")
internal fun SalesListScreenContent(
    uiState: SalesListUiState,
    isRefreshing: Boolean,
    canCreate: Boolean,
    onRefresh: () -> Unit,
    onDocumentClick: (String) -> Unit,
    onNewInvoice: () -> Unit,
    onSearch: (String) -> Unit,
) {
    var active by rememberSaveable { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.sales_title)) },
            )
        },
        floatingActionButton = {
            if (uiState is SalesListUiState.Loaded && canCreate) {
                FloatingActionButton(
                    onClick = onNewInvoice,
                ) {
                    Icon(Icons.Filled.Add, contentDescription = stringResource(R.string.sales_new))
                }
            }
        },
    ) { padding ->
        PullRefreshHost(
            isRefreshing = isRefreshing,
            onRefresh = onRefresh,
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when (val state = uiState) {
                is SalesListUiState.Loading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator()
                    }
                }

                is SalesListUiState.Failed -> {
                    ErrorState(
                        icon = Icons.Filled.ErrorOutline,
                        title = stringResource(R.string.error_title),
                        message = stringResource(state.exception.stringRes()),
                        ctaLabel = stringResource(R.string.action_retry),
                        onCtaClick = onRefresh,
                    )
                }

                is SalesListUiState.Loaded -> {
                    if (state.documents.isEmpty()) {
                        EmptyState(
                            icon = Icons.Filled.Inbox,
                            title = stringResource(R.string.empty_title),
                            ctaLabel = stringResource(R.string.action_refresh),
                            onCtaClick = onRefresh,
                        )
                    } else {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 16.dp),
                        ) {
                            item {
                                DockedSearchBar(
                                    query = state.query,
                                    onQueryChange = onSearch,
                                    onSearch = { active = false },
                                    active = active,
                                    onActiveChange = { active = it },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 8.dp),
                                    placeholder = { Text(stringResource(R.string.sales_search_hint)) },
                                    leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                                ) {
                                    // Search suggestions could go here
                                }
                            }
                            items(state.documents) { doc ->
                                DocumentRow(
                                    record = doc,
                                    modifier = Modifier
                                        .clickable { onDocumentClick(doc.id) }
                                        .testTag("sales_document_row"),
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
