package dev.ishflow.android.feature.cari

import dev.ishflow.android.appshared.models.BalanceDirection
import dev.ishflow.android.appshared.models.Counterparty
import dev.ishflow.android.appshared.models.CounterpartyType
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.ishflow.android.appshared.ui.EmptyState
import dev.ishflow.android.appshared.ui.ErrorState
import dev.ishflow.android.appshared.ui.PullRefreshHost
import dev.ishflow.android.appshared.ui.stringRes
import dev.ishflow.android.core.ui.AppTopBar
import dev.ishflow.android.core.ui.LocalShellActions
import java.math.BigDecimal
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CariScreen(
    onCounterpartyClick: (id: String, type: String) -> Unit,
    viewModel: CariViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val isRefreshing by viewModel.refreshing.collectAsStateWithLifecycle()
    val canView by viewModel.canView.collectAsStateWithLifecycle()
    val shell = LocalShellActions.current
    val title = stringResource(R.string.cari_title)

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
            if (!canView) {
                EmptyState(
                    icon = Icons.Filled.Lock,
                    title = stringResource(R.string.cari_empty_title),
                    ctaLabel = stringResource(R.string.cari_action_refresh),
                    onCtaClick = viewModel::refresh,
                )
                return@PullRefreshHost
            }
            val selectedKind = (uiState as? CariUiState.Loaded)?.kind ?: CariKind.Customer
            Box(modifier = Modifier.fillMaxSize()) {
                CariContent(
                    state = uiState,
                    selectedKind = selectedKind,
                    onKindSelected = viewModel::selectKind,
                    onRetry = viewModel::refresh,
                    onCounterpartyClick = onCounterpartyClick,
                )
            }
        }
    }
}

@Composable
private fun CariContent(
    state: CariUiState,
    selectedKind: CariKind,
    onKindSelected: (CariKind) -> Unit,
    onRetry: () -> Unit,
    onCounterpartyClick: (id: String, type: String) -> Unit,
) {
    when (state) {
        is CariUiState.Loading -> CenteredProgress()
        is CariUiState.Failed -> ErrorState(
            icon = Icons.Filled.ErrorOutline,
            title = stringResource(R.string.cari_error_title),
            message = stringResource(state.exception.stringRes()),
            ctaLabel = stringResource(R.string.cari_error_retry),
            onCtaClick = onRetry,
        )
        is CariUiState.Loaded -> LoadedList(
            items = state.items,
            selectedKind = selectedKind,
            onKindSelected = onKindSelected,
            onRetry = onRetry,
            onCounterpartyClick = onCounterpartyClick,
        )
    }
}

@Composable
private fun CenteredProgress() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        CircularProgressIndicator()
    }
}

@Composable
private fun LoadedList(
    items: List<Counterparty>,
    selectedKind: CariKind,
    onKindSelected: (CariKind) -> Unit,
    onRetry: () -> Unit,
    onCounterpartyClick: (id: String, type: String) -> Unit,
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            CariFilterChips(
                selected = selectedKind,
                onSelected = onKindSelected,
            )
        }
        if (items.isEmpty()) {
            item {
                EmptyState(
                    icon = Icons.Filled.Inbox,
                    title = stringResource(R.string.cari_empty_title),
                    ctaLabel = stringResource(R.string.cari_action_refresh),
                    onCtaClick = onRetry,
                )
            }
        } else {
            items(items, key = { it.id }) { item ->
                CounterpartyRow(
                    counterparty = item,
                    onClick = { onCounterpartyClick(item.id, item.type.name) },
                )
            }
            item { Spacer(Modifier.height(12.dp)) }
        }
    }
}

@Composable
private fun CounterpartyRow(
    counterparty: Counterparty,
    onClick: () -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            CounterpartyAvatar(counterparty.name)
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = counterparty.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(2.dp))
                TypePill(counterparty.type)
            }
            BalanceColumn(counterparty)
        }
    }
}

@Composable
private fun CounterpartyAvatar(name: String) {
    val initial = remember(name) { name.firstOrNull()?.uppercaseChar()?.toString() ?: "?" }
    Surface(
        modifier = Modifier.size(40.dp).clip(CircleShape),
        color = MaterialTheme.colorScheme.primaryContainer,
    ) {
        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
            Text(
                text = initial,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
            )
        }
    }
}

@Composable
private fun TypePill(type: CounterpartyType) {
    // Brand palette is 2 blues + black + off-white. `tertiary` is not defined
    // in IshflowTheme (#0F5EEF / #B0E9FD / #000 / #F4F4F4) so it would fall
    // back to Material's default pink. Stay within the brand:
    // - Customer → BrandSecondary (light blue fill)
    // - Supplier → BrandPrimaryContainer (soft blue tint)
    val bg = when (type) {
        CounterpartyType.customer -> MaterialTheme.colorScheme.secondaryContainer
        CounterpartyType.supplier -> MaterialTheme.colorScheme.primaryContainer
    }
    val fg = when (type) {
        CounterpartyType.customer -> MaterialTheme.colorScheme.onSecondaryContainer
        CounterpartyType.supplier -> MaterialTheme.colorScheme.onPrimaryContainer
    }
    Surface(
        color = bg,
        shape = androidx.compose.foundation.shape.RoundedCornerShape(6.dp),
    ) {
        Text(
            text = stringResource(type.toTypeLabel()),
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
            style = MaterialTheme.typography.labelSmall,
            color = fg,
        )
    }
}

@Composable
private fun BalanceColumn(counterparty: Counterparty) {
    val balance = counterparty.balance?.let { runCatching { BigDecimal(it) }.getOrNull() }
    if (balance == null) return
    val direction = counterparty.balanceDirection ?: BalanceDirection.zero
    // Brand has no tertiary; use BrandPrimary blue for owesUs (money coming
    // in feels positive within a 2-blue brand) and error red for weOwe.
    val (labelRes, color) = when (direction) {
        BalanceDirection.owesUs -> R.string.cari_balance_owes_us to MaterialTheme.colorScheme.primary
        BalanceDirection.weOwe -> R.string.cari_balance_we_owe to MaterialTheme.colorScheme.error
        BalanceDirection.zero -> R.string.cari_balance_zero to MaterialTheme.colorScheme.onSurfaceVariant
    }
    val isZero = balance.signum() == 0
    Column(horizontalAlignment = Alignment.End) {
        Text(
            text = stringResource(labelRes),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        if (!isZero) {
            Spacer(Modifier.height(2.dp))
            Text(
                text = formatBalance(balance.abs(), counterparty.currency),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = color,
                maxLines = 1,
            )
        }
    }
}

private fun formatBalance(amount: BigDecimal, currency: String?): String {
    val fmt = NumberFormat.getNumberInstance(Locale.US).apply {
        maximumFractionDigits = 2
        minimumFractionDigits = 0
    }
    val number = fmt.format(amount)
    return if (currency.isNullOrBlank()) number else "$number $currency"
}

@Composable
private fun CariFilterChips(
    selected: CariKind,
    onSelected: (CariKind) -> Unit,
) {
    // Two-tab filter: Customers / Suppliers. The `All` enum value still
    // exists in `CariKind` (used by repository contracts + tests) but is
    // intentionally not exposed in the UI — counterparty browsing is always
    // scoped to one side at a time per UX feedback 2026-05-14.
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        FilterChip(
            selected = selected == CariKind.Customer,
            onClick = { onSelected(CariKind.Customer) },
            label = { Text(stringResource(R.string.cari_filter_customers)) },
        )
        FilterChip(
            selected = selected == CariKind.Supplier,
            onClick = { onSelected(CariKind.Supplier) },
            label = { Text(stringResource(R.string.cari_filter_suppliers)) },
        )
    }
}

private fun CounterpartyType.toTypeLabel(): Int = when (this) {
    CounterpartyType.supplier -> R.string.cari_type_supplier
    CounterpartyType.customer -> R.string.cari_type_customer
}
