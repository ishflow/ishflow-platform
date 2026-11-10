package dev.ishflow.android.feature.cari.detail

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.ishflow.android.appshared.models.BalanceDirection
import dev.ishflow.android.appshared.models.BalanceTrendPoint
import dev.ishflow.android.appshared.models.Counterparty
import dev.ishflow.android.appshared.models.CounterpartyType
import dev.ishflow.android.appshared.models.Customer360Invoice
import dev.ishflow.android.appshared.models.Customer360Payment
import dev.ishflow.android.appshared.models.Customer360StockOut
import dev.ishflow.android.appshared.models.NoteEntry
import dev.ishflow.android.appshared.models.ProductMovementSummary
import dev.ishflow.android.appshared.models.DocumentRecord
import dev.ishflow.android.appshared.ui.EmptyState
import dev.ishflow.android.core.ui.AppLargeTopBar
import dev.ishflow.android.core.ui.BalanceSparkline
import dev.ishflow.android.core.ui.LocalShellActions
import dev.ishflow.android.feature.cari.R
import dev.ishflow.android.feature.cari.detail.tabs.InvoicesTab
import dev.ishflow.android.feature.cari.detail.tabs.NotesTab
import dev.ishflow.android.feature.cari.detail.tabs.PaymentsTab
import dev.ishflow.android.feature.cari.detail.tabs.StockOutsTab
import kotlinx.coroutines.launch

private val SECTION_GAP = 12.dp
private val CARD_PADDING = 16.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CounterpartyDetailScreen(viewModel: CounterpartyDetailViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()
    val counterparty = state.counterparty
    val title = counterparty?.name ?: stringResource(R.string.cari_detail_title)
    val shell = LocalShellActions.current

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
                extraActions = {
                    if (counterparty != null) {
                        BalancePill(counterparty)
                    }
                },
            )
        },
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when {
                state.isLoading -> CounterpartySkeleton()
                counterparty == null -> CenteredError()
                state.c360 != null -> Customer360Layout(
                    counterparty = counterparty,
                    sparkline = state.sparkline,
                    invoices = state.invoices,
                    payments = state.payments,
                    stockOuts = state.stockOuts,
                    productMovements = state.productMovements,
                    notes = state.notes,
                    currency = state.currency,
                )
                else -> LegacyLoadedDetail(
                    counterparty = counterparty,
                    searchQuery = state.searchQuery,
                    recentDocs = state.recentDocs,
                    onSearchChange = viewModel::onSearchQueryChanged,
                )
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun Customer360Layout(
    counterparty: Counterparty,
    sparkline: List<BalanceTrendPoint>,
    invoices: List<Customer360Invoice>,
    payments: List<Customer360Payment>,
    stockOuts: List<Customer360StockOut>,
    productMovements: List<ProductMovementSummary>,
    notes: List<NoteEntry>,
    currency: String?,
) {
    Column(modifier = Modifier.fillMaxSize()) {
        HeaderCardWithSparkline(counterparty = counterparty, sparkline = sparkline)

        val pagerState = rememberPagerState(pageCount = { 4 })
        val scope = rememberCoroutineScope()
        val tabLabels = listOf(
            R.string.customer_360_tab_invoices,
            R.string.customer_360_tab_payments,
            R.string.customer_360_tab_stock_outs,
            R.string.customer_360_tab_notes,
        )
        TabRow(selectedTabIndex = pagerState.currentPage) {
            tabLabels.forEachIndexed { index, labelRes ->
                Tab(
                    selected = pagerState.currentPage == index,
                    onClick = { scope.launch { pagerState.animateScrollToPage(index) } },
                    text = { Text(stringResource(labelRes)) },
                )
            }
        }
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxSize(),
        ) { page ->
            when (page) {
                0 -> InvoicesTab(invoices = invoices, currency = currency)
                1 -> PaymentsTab(payments = payments, currency = currency)
                2 -> StockOutsTab(items = productMovements)
                3 -> NotesTab(notes = notes)
            }
        }
    }
}

@Composable
private fun HeaderCardWithSparkline(
    counterparty: Counterparty,
    sparkline: List<BalanceTrendPoint>,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(CARD_PADDING),
    ) {
        Column(modifier = Modifier.padding(CARD_PADDING)) {
            Text(text = counterparty.name, style = MaterialTheme.typography.titleLarge)
            Text(
                text = stringResource(counterparty.type.toTypeLabel()),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (sparkline.size >= 2) {
                Spacer(modifier = Modifier.height(12.dp))
                BalanceSparkline(
                    points = sparkline.map { it.balance.toFloat() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                )
            }
        }
    }
}

@Composable
private fun BalancePill(counterparty: Counterparty) {
    val balance = counterparty.balance ?: return
    val (background, foreground) = balanceColors(counterparty.balanceDirection)
    val a11yLabel = balanceA11yLabel(counterparty.balanceDirection)
    val display = buildBalanceDisplay(balance = balance, currency = counterparty.currency)

    Card(
        colors = CardDefaults.cardColors(
            containerColor = background,
            contentColor = foreground,
        ),
        modifier = Modifier.padding(end = 12.dp),
    ) {
        Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)) {
            Text(
                text = a11yLabel,
                style = MaterialTheme.typography.labelSmall,
            )
            Text(
                text = display,
                style = MaterialTheme.typography.titleSmall,
            )
        }
    }
}

@Composable
private fun balanceColors(direction: BalanceDirection?): Pair<Color, Color> {
    val scheme = MaterialTheme.colorScheme
    // Brand palette is 2 blues + black + off-white — `tertiary` is not
    // defined in IshflowTheme so its fallback (Material default pink) leaks
    // through. Pin owesUs to the brand blue family instead.
    return when (direction) {
        BalanceDirection.owesUs -> scheme.primaryContainer to scheme.onPrimaryContainer
        BalanceDirection.weOwe -> scheme.errorContainer to scheme.onErrorContainer
        BalanceDirection.zero, null -> scheme.surfaceVariant to scheme.onSurfaceVariant
    }
}

@Composable
private fun balanceA11yLabel(direction: BalanceDirection?): String = when (direction) {
    BalanceDirection.owesUs -> stringResource(R.string.cari_balance_owes_us)
    BalanceDirection.weOwe -> stringResource(R.string.cari_balance_we_owe)
    BalanceDirection.zero, null -> stringResource(R.string.cari_balance_zero)
}

private fun buildBalanceDisplay(balance: String, currency: String?): String =
    if (currency.isNullOrBlank()) balance else "$balance $currency"

@Composable
private fun LegacyLoadedDetail(
    counterparty: Counterparty,
    searchQuery: String,
    recentDocs: List<DocumentRecord>,
    onSearchChange: (String) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(CARD_PADDING),
        verticalArrangement = Arrangement.spacedBy(SECTION_GAP),
    ) {
        CounterpartyHeader(counterparty)
        ContactCard(counterparty)
        BalanceCard(counterparty)
        DocumentSearchField(query = searchQuery, onChange = onSearchChange)
        RecentDocumentsCard(recentDocs)
    }
}

@Composable
private fun CounterpartyHeader(counterparty: Counterparty) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(CARD_PADDING).fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = counterparty.name,
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.weight(1f),
            )
            AssistChip(
                onClick = {},
                enabled = false,
                label = { Text(stringResource(counterparty.type.toTypeLabel())) },
                colors = AssistChipDefaults.assistChipColors(
                    disabledContainerColor = MaterialTheme.colorScheme.surfaceVariant,
                    disabledLabelColor = MaterialTheme.colorScheme.onSurfaceVariant,
                ),
            )
        }
    }
}

@Composable
private fun BalanceCard(counterparty: Counterparty) {
    val balance = counterparty.balance ?: return
    val (background, foreground) = balanceColors(counterparty.balanceDirection)
    val directionLabel = balanceA11yLabel(counterparty.balanceDirection)
    val display = buildBalanceDisplay(balance = balance, currency = counterparty.currency)
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = background,
            contentColor = foreground,
        ),
    ) {
        Column(modifier = Modifier.padding(CARD_PADDING)) {
            Text(
                text = stringResource(R.string.cari_detail_balance_title),
                style = MaterialTheme.typography.labelMedium,
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = directionLabel, style = MaterialTheme.typography.bodyMedium)
            Text(text = display, style = MaterialTheme.typography.titleMedium)
        }
    }
}

@Composable
private fun CounterpartySkeleton() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(CARD_PADDING),
        verticalArrangement = Arrangement.spacedBy(SECTION_GAP),
    ) {
        SkeletonBlock(height = 88.dp)
        SkeletonBlock(height = 64.dp)
        SkeletonBlock(height = 56.dp)
    }
}

@Composable
private fun SkeletonBlock(height: androidx.compose.ui.unit.Dp) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(height)
            .background(
                color = MaterialTheme.colorScheme.surfaceVariant,
                shape = MaterialTheme.shapes.small,
            ),
    )
}

@Composable
private fun ContactCard(counterparty: Counterparty) {
    val hasAnyContact = listOfNotNull(
        counterparty.contactName,
        counterparty.phone,
        counterparty.email,
        counterparty.address,
    ).isNotEmpty()
    if (!hasAnyContact) return

    Card(modifier = Modifier.fillMaxWidth()) {
        Column {
            counterparty.contactName?.let { value ->
                DetailRow(stringResource(R.string.cari_contact_label), value)
            }
            counterparty.phone?.let { value ->
                DetailRow(stringResource(R.string.cari_phone_label), value)
            }
            counterparty.email?.let { value ->
                DetailRow(stringResource(R.string.cari_email_label), value)
            }
            counterparty.address?.let { value ->
                DetailRow(stringResource(R.string.cari_address_label), value)
            }
        }
    }
}

@Composable
private fun DocumentSearchField(query: String, onChange: (String) -> Unit) {
    OutlinedTextField(
        value = query,
        onValueChange = onChange,
        label = { Text(stringResource(R.string.cari_search_documents)) },
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
private fun RecentDocumentsCard(recentDocs: List<DocumentRecord>) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(CARD_PADDING)) {
            Text(
                text = stringResource(R.string.cari_recent_documents),
                style = MaterialTheme.typography.titleMedium,
            )
            if (recentDocs.isEmpty()) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = SECTION_GAP),
                    horizontalArrangement = Arrangement.Center,
                ) {
                    EmptyState(
                        icon = Icons.Filled.Inbox,
                        title = stringResource(R.string.cari_detail_recent_documents_empty),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            } else {
                recentDocs.take(MAX_RECENT_DOCS).forEach { doc ->
                    DetailRow(label = doc.number, value = doc.status.name)
                }
            }
        }
    }
}

private const val MAX_RECENT_DOCS = 5

@Composable
private fun CenteredError() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                imageVector = Icons.Filled.Inbox,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.error,
            )
            Text(
                text = stringResource(R.string.cari_detail_missing),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(top = 12.dp),
            )
        }
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    ListItem(
        headlineContent = { Text(value) },
        overlineContent = { Text(label) },
    )
}

private fun CounterpartyType.toTypeLabel(): Int = when (this) {
    CounterpartyType.supplier -> R.string.cari_type_supplier
    CounterpartyType.customer -> R.string.cari_type_customer
}
