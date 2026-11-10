package dev.ishflow.android.feature.prices

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DockedSearchBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.ishflow.android.appshared.ui.EmptyState
import dev.ishflow.android.appshared.ui.ErrorState
import dev.ishflow.android.appshared.ui.PullRefreshHost
import dev.ishflow.android.appshared.ui.stringRes
import dev.ishflow.android.core.ui.AppTopBar
import dev.ishflow.android.core.ui.LocalShellActions
import dev.ishflow.android.feature.prices.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
@Suppress("LongMethod")
fun PricesListScreen(onPriceClick: (String) -> Unit, viewModel: PricesListViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val isRefreshing by viewModel.refreshing.collectAsStateWithLifecycle()
    var active by rememberSaveable { mutableStateOf(false) }
    val shell = LocalShellActions.current
    val title = stringResource(R.string.prices_title)

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
    ) { padding ->
        PullRefreshHost(
            isRefreshing = isRefreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when (val state = uiState) {
                is PricesListUiState.Loading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator()
                    }
                }

                is PricesListUiState.Failed -> {
                    ErrorState(
                        icon = Icons.Filled.ErrorOutline,
                        title = stringResource(R.string.error_title),
                        message = stringResource(state.exception.stringRes()),
                        ctaLabel = stringResource(R.string.action_retry),
                        onCtaClick = { viewModel.refresh() },
                    )
                }

                is PricesListUiState.Loaded -> {
                    if (state.records.isEmpty()) {
                        EmptyState(
                            icon = Icons.Filled.Inbox,
                            title = stringResource(R.string.empty_title),
                            ctaLabel = stringResource(R.string.action_refresh),
                            onCtaClick = { viewModel.refresh() },
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
                                    onQueryChange = { viewModel.search(it) },
                                    onSearch = { active = false },
                                    active = active,
                                    onActiveChange = { active = it },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 8.dp),
                                    placeholder = { Text(stringResource(R.string.prices_search_hint)) },
                                    leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                                ) {
                                    // Search suggestions could go here
                                }
                            }
                            items(state.records) { record ->
                                ListItem(
                                    headlineContent = { Text(record.name) },
                                    supportingContent = record.code?.let { { Text(it) } },
                                    modifier = Modifier.clickable { onPriceClick(record.id) },
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
