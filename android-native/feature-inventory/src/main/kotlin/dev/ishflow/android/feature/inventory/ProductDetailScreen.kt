package dev.ishflow.android.feature.inventory

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.ishflow.android.appshared.models.RegisterBalanceRow
import dev.ishflow.android.appshared.models.StockMovement
import dev.ishflow.android.appshared.ui.EmptyState
import dev.ishflow.android.appshared.ui.ErrorState
import dev.ishflow.android.core.ui.AppLargeTopBar
import dev.ishflow.android.core.ui.LocalShellActions
import dev.ishflow.android.feature.inventory.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
@Suppress("LongMethod")
fun ProductDetailScreen(
    onOpenDocument: (docKind: String, docId: String) -> Unit,
    viewModel: ProductDetailViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()
    val shell = LocalShellActions.current

    val title = when (val state = uiState) {
        is ProductDetailUiState.Loaded -> state.productName
        else -> stringResource(R.string.product_detail_title)
    }

    Scaffold(
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
        topBar = {
            AppLargeTopBar(
                title = title,
                onAvatarClick = shell.onAvatarClick,
                onBellClick = shell.onBellClick,
                avatarInitial = shell.avatarInitial,
                notificationBadge = shell.notificationBadge,
                scrollBehavior = scrollBehavior,
            )
        },
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when (val state = uiState) {
                is ProductDetailUiState.Loading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator()
                    }
                }

                is ProductDetailUiState.Failed -> {
                    ErrorState(
                        icon = Icons.Filled.ErrorOutline,
                        title = stringResource(R.string.error_title),
                        message = state.exception.message,
                        ctaLabel = stringResource(R.string.action_retry),
                        onCtaClick = { viewModel.retry() },
                    )
                }

                is ProductDetailUiState.Loaded -> {
                    ProductDetailContent(
                        state = state,
                        onOpenDocument = onOpenDocument,
                    )
                }
            }
        }
    }
}

@Composable
@Suppress("LongMethod")
private fun ProductDetailContent(
    state: ProductDetailUiState.Loaded,
    onOpenDocument: (docKind: String, docId: String) -> Unit,
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // Total stock card
        item {
            Spacer(modifier = Modifier.height(4.dp))
            TotalStockCard(totalQty = state.totalQty)
        }

        // Per-warehouse balances
        if (state.balances.isNotEmpty()) {
            item {
                SectionHeader(stringResource(R.string.product_detail_balance_per_warehouse))
            }
            items(state.balances) { row ->
                WarehouseBalanceRow(row = row)
            }
        }

        // Movements section header
        item {
            Spacer(modifier = Modifier.height(4.dp))
            SectionHeader(stringResource(R.string.product_detail_movements))
        }

        if (state.movements.isEmpty()) {
            item {
                EmptyState(
                    icon = Icons.Filled.Inbox,
                    title = stringResource(R.string.product_detail_empty_movements),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 24.dp),
                )
            }
        } else {
            items(state.movements) { movement ->
                MovementRow(
                    movement = movement,
                    onClick = { onOpenDocument(movement.docKind, movement.docId) },
                )
            }
        }

        item { Spacer(modifier = Modifier.height(16.dp)) }
    }
}

@Composable
private fun TotalStockCard(totalQty: String) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = stringResource(R.string.product_detail_total_stock),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = totalQty,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
private fun SectionHeader(label: String) {
    Text(
        text = label,
        style = MaterialTheme.typography.titleSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(top = 4.dp, bottom = 2.dp),
    )
}

@Composable
private fun WarehouseBalanceRow(row: RegisterBalanceRow) {
    val warehouse = row.groupLabels?.get("warehouse")
        ?: row.groupKey["warehouse"]
        ?: "—"
    val qty = row.quantity?.toPlainString() ?: "0"
    ListItem(
        headlineContent = { Text(warehouse) },
        trailingContent = {
            Text(
                text = qty,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium,
            )
        },
    )
    HorizontalDivider()
}

@Composable
private fun MovementRow(
    movement: StockMovement,
    onClick: () -> Unit,
) {
    val isIn = movement.direction == "in"
    val qtyText = if (isIn) "+${movement.qty}" else "−${movement.qty}"
    val qtyColor = if (isIn) {
        MaterialTheme.colorScheme.primary
    } else {
        MaterialTheme.colorScheme.error
    }

    // Format date: take first 10 chars of ISO8601 (YYYY-MM-DD)
    val dateLabel = movement.date.take(10)

    ListItem(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        headlineContent = {
            Text(movement.docNumber)
        },
        supportingContent = {
            Column {
                Text(
                    text = dateLabel,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    text = movement.warehouse,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        },
        leadingContent = {
            Icon(
                imageVector = Icons.Filled.SwapHoriz,
                contentDescription = null,
                tint = qtyColor,
                modifier = Modifier.size(24.dp),
            )
        },
        trailingContent = {
            Text(
                text = qtyText,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.SemiBold,
                color = qtyColor,
            )
        },
    )
    HorizontalDivider()
}
