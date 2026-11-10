package dev.ishflow.android.feature.purchases

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
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
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
import dev.ishflow.android.core.ui.AppTopBar
import dev.ishflow.android.core.ui.LocalShellActions

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PurchasesListScreen(
    onDocumentClick: (String) -> Unit,
    onNewInvoice: () -> Unit,
    viewModel: PurchasesListViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val isRefreshing by viewModel.refreshing.collectAsStateWithLifecycle()
    val canCreate by viewModel.canCreate.collectAsStateWithLifecycle()

    PurchasesListScreenContent(
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
internal fun PurchasesListScreenContent(
    uiState: PurchasesListUiState,
    isRefreshing: Boolean,
    canCreate: Boolean,
    onRefresh: () -> Unit,
    onDocumentClick: (String) -> Unit,
    onNewInvoice: () -> Unit,
    onSearch: (String) -> Unit,
) {
    var active by rememberSaveable { mutableStateOf(false) }
    val shell = LocalShellActions.current
    val title = stringResource(R.string.purchases_title)

    Scaffold(
        topBar = {
            AppTopBar(
                title = title,
                onAvatarClick = shell.onAvatarClick,
                onBellClick = shell.onBellClick,
                avatarInitial = shell.avatarInitial,
                notificationBadge = shell.notificationBadge,
            )
        },
        floatingActionButton = {
            if (uiState is PurchasesListUiState.Loaded && canCreate) {
                FloatingActionButton(onClick = onNewInvoice) {
                    Icon(
                        Icons.Filled.Add,
                        contentDescription = stringResource(R.string.purchases_new),
                    )
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
                is PurchasesListUiState.Loading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator()
                    }
                }

                is PurchasesListUiState.Failed -> {
                    ErrorState(
                        icon = Icons.Filled.ErrorOutline,
                        title = stringResource(R.string.purchase_error_title),
                        message = stringResource(state.exception.stringRes()),
                        ctaLabel = stringResource(R.string.purchase_action_retry),
                        onCtaClick = onRefresh,
                    )
                }

                is PurchasesListUiState.Loaded -> {
                    if (state.documents.isEmpty()) {
                        EmptyState(
                            icon = Icons.Filled.Inbox,
                            title = stringResource(R.string.purchase_empty_title),
                            ctaLabel = stringResource(R.string.purchase_action_refresh),
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
                                    placeholder = {
                                        Text(stringResource(R.string.purchases_search_hint))
                                    },
                                    leadingIcon = {
                                        Icon(Icons.Filled.Search, contentDescription = null)
                                    },
                                ) { /* suggestions slot intentionally empty */ }
                            }
                            items(state.documents) { doc ->
                                DocumentRow(
                                    record = doc,
                                    modifier = Modifier
                                        .clickable { onDocumentClick(doc.id) }
                                        .testTag("purchase_document_row"),
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
