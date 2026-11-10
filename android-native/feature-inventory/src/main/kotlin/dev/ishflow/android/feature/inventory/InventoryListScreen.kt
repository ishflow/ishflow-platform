package dev.ishflow.android.feature.inventory

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DockedSearchBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
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
import dev.ishflow.android.core.ui.Haptics
import dev.ishflow.android.core.ui.LocalShellActions
import dev.ishflow.android.feature.inventory.R
import dev.ishflow.android.feature.inventory.components.WarehouseSectionCard
import dev.ishflow.android.feature.inventory.components.groupByWarehouse
import dev.ishflow.android.feature.inventory.filter.InventoryFilterChipRow
import dev.ishflow.android.feature.inventory.filter.InventoryFilterSheet

@OptIn(ExperimentalMaterial3Api::class)
@Composable
@Suppress("LongMethod")
fun InventoryListScreen(
    onProductClick: (productId: String, productName: String, warehouse: String, quantity: String) -> Unit,
    onScanClick: () -> Unit,
    viewModel: InventoryListViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val isRefreshing by viewModel.refreshing.collectAsStateWithLifecycle()
    val filter by viewModel.filter.collectAsStateWithLifecycle()
    var active by rememberSaveable { mutableStateOf(false) }
    var showFilterSheet by rememberSaveable { mutableStateOf(false) }
    val refreshHaptic = Haptics.rememberClickHaptic()
    val shell = LocalShellActions.current
    val title = stringResource(R.string.inventory_title)
    val filterCd = stringResource(R.string.inventory_filter_title)

    // Per-warehouse expanded state. Survives recomposition but resets when
    // the screen leaves the composition — fine for a list of ~handful of
    // warehouses. When only one warehouse is present we default it open
    // (see `isExpanded` below); otherwise everything starts collapsed for
    // a compact at-a-glance overview.
    val expandedByWarehouse = remember { mutableStateMapOf<String, Boolean>() }

    Scaffold(
        topBar = {
            AppTopBar(
                title = title,
                onAvatarClick = shell.onAvatarClick,
                onBellClick = shell.onBellClick,
                avatarInitial = shell.avatarInitial,
                notificationBadge = shell.notificationBadge,
                extraActions = {
                    IconButton(onClick = { showFilterSheet = true }) {
                        BadgedBox(
                            badge = {
                                if (filter.activeCount > 0) {
                                    Badge { Text(filter.activeCount.toString()) }
                                }
                            },
                        ) {
                            Icon(
                                Icons.Filled.Tune,
                                contentDescription = filterCd,
                            )
                        }
                    }
                },
            )
        },
        floatingActionButton = {
            if (uiState is InventoryListUiState.Loaded) {
                FloatingActionButton(onClick = onScanClick) {
                    Icon(Icons.Filled.PhotoCamera, contentDescription = stringResource(R.string.scan_title))
                }
            }
        },
    ) { padding ->
        PullRefreshHost(
            isRefreshing = isRefreshing,
            onRefresh = { refreshHaptic(); viewModel.refresh() },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when (val state = uiState) {
                is InventoryListUiState.Loading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator()
                    }
                }

                is InventoryListUiState.Failed -> {
                    ErrorState(
                        icon = Icons.Filled.ErrorOutline,
                        title = stringResource(R.string.error_title),
                        message = stringResource(state.exception.stringRes()),
                        ctaLabel = stringResource(R.string.action_retry),
                        onCtaClick = { viewModel.refresh() },
                    )
                }

                is InventoryListUiState.Loaded -> {
                    if (state.items.isEmpty()) {
                        EmptyState(
                            icon = Icons.Filled.Inbox,
                            title = stringResource(R.string.inventory_empty_title),
                            message = stringResource(R.string.inventory_empty_hint),
                            ctaLabel = stringResource(R.string.action_refresh),
                            onCtaClick = { viewModel.refresh() },
                        )
                    } else {
                        val grouped = groupByWarehouse(state.items)
                        val singleWarehouse = grouped.size == 1

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
                                    placeholder = { Text(stringResource(R.string.inventory_search_hint)) },
                                    leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                                ) {
                                }
                            }
                            item {
                                InventoryFilterChipRow(
                                    filter = filter,
                                    onCategoryClick = { showFilterSheet = true },
                                    onGroupClick = { showFilterSheet = true },
                                    onWarehouseClick = { showFilterSheet = true },
                                    onLowStockToggle = { viewModel.toggleLowStockOnly() },
                                )
                            }
                            items(
                                items = grouped,
                                key = { (warehouseName, _) -> warehouseName },
                            ) { (warehouseName, items) ->
                                val isExpanded = expandedByWarehouse[warehouseName]
                                    ?: singleWarehouse
                                WarehouseSectionCard(
                                    warehouseName = warehouseName,
                                    items = items,
                                    expanded = isExpanded,
                                    onToggle = {
                                        expandedByWarehouse[warehouseName] = !isExpanded
                                    },
                                    onItemClick = { item ->
                                        onProductClick(
                                            item.productId,
                                            item.productName,
                                            item.warehouse,
                                            item.quantity.toPlainString(),
                                        )
                                    },
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (showFilterSheet) {
        InventoryFilterSheet(
            initial = filter,
            categoryOptions = viewModel.categoryOptions,
            groupOptions = viewModel.groupOptions,
            warehouseOptions = viewModel.warehouseOptions,
            onApply = { viewModel.applyFilter(it) },
            onDismiss = { showFilterSheet = false },
        )
    }
}
