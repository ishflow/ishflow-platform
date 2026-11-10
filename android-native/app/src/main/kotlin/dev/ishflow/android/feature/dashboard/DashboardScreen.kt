package dev.ishflow.android.feature.dashboard

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.Inventory
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.ishflow.android.R
import dev.ishflow.android.appshared.ui.DocumentRow
import dev.ishflow.android.appshared.ui.EmptyState
import dev.ishflow.android.appshared.ui.ErrorState
import dev.ishflow.android.appshared.ui.KPIRow
import dev.ishflow.android.appshared.ui.PullRefreshHost
import dev.ishflow.android.appshared.ui.stringRes
import dev.ishflow.android.core.ui.AppTopBar
import dev.ishflow.android.core.ui.Haptics
import dev.ishflow.android.core.ui.LocalShellActions
import dev.ishflow.android.feature.dashboard.layouts.ChartsLayout
import dev.ishflow.android.feature.dashboard.layouts.HeroLayout
import dev.ishflow.android.feature.dashboard.layouts.PastelBentoLayout
import dev.ishflow.android.feature.dashboard.widgets.ActionTarget
import dev.ishflow.android.feature.dashboard.widgets.EmptyTenantOnboarding
import dev.ishflow.android.feature.onboarding.progress.SetupProgressItem
import dev.ishflow.android.feature.onboarding.progress.SetupProgressWidget
import java.math.BigDecimal
import java.text.NumberFormat

/**
 * Navigation hooks the dashboard exposes to [MainScaffold]. Kept as a
 * data class so the screen takes a single bundle and the host doesn't
 * grow per-action lambdas every time we add a new widget.
 */
data class DashboardActions(
    val onOpenDocs: () -> Unit = {},
    val onOpenCari: () -> Unit = {},
    val onOpenInventory: () -> Unit = {},
    val onOpenDocument: (kind: String, id: String) -> Unit = { _, _ -> },
    /**
     * Tapped on a recent-invoice row in the legacy KPI dashboard. The legacy
     * path only fetches `sales.invoice` rows, so a sales-specific id is enough.
     */
    val onOpenSalesDocument: (id: String) -> Unit = {},
    val onOpenCounterpartyWizard: () -> Unit = {},
    val onOpenNewProduct: () -> Unit = {},
    /** Setup progress widget: navigate to price types screen. */
    val onOpenPrices: () -> Unit = {},
    /** Setup progress widget: navigate to invite / members screen (opens More sheet as fallback). */
    val onOpenInviteTeam: () -> Unit = {},
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    actions: DashboardActions = DashboardActions(),
    viewModel: DashboardViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val isRefreshing by viewModel.refreshing.collectAsStateWithLifecycle()
    val layoutBundle by viewModel.layoutBundle.collectAsStateWithLifecycle()
    val style by viewModel.style.collectAsStateWithLifecycle()
    val setupVisible by viewModel.setupProgressVisible.collectAsStateWithLifecycle()

    DashboardScreenContent(
        uiState = uiState,
        layoutBundle = layoutBundle,
        style = style,
        isRefreshing = isRefreshing,
        onRefresh = viewModel::refresh,
        actions = actions,
        setupVisible = setupVisible,
        onDismissSetupProgress = viewModel::dismissSetupProgress,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun DashboardScreenContent(
    uiState: DashboardUiState,
    layoutBundle: DashboardLayoutBundle? = null,
    style: DashboardStyle = DashboardStyle.HERO,
    isRefreshing: Boolean = false,
    onRefresh: () -> Unit = {},
    actions: DashboardActions = DashboardActions(),
    setupVisible: Boolean = true,
    onDismissSetupProgress: () -> Unit = {},
) {
    val refreshHaptic = Haptics.rememberClickHaptic()
    val hapticRefresh: () -> Unit = { refreshHaptic(); onRefresh() }
    val shell = LocalShellActions.current
    val title = stringResource(R.string.dashboard_title)

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
            onRefresh = hapticRefresh,
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            if (layoutBundle != null) {
                GlanceAndActDashboard(
                    bundle = layoutBundle,
                    style = style,
                    actions = actions,
                    setupVisible = setupVisible,
                    onDismissSetupProgress = onDismissSetupProgress,
                )
            } else {
                LegacyDashboard(
                    uiState = uiState,
                    onRefresh = onRefresh,
                    onOpenSalesDocument = actions.onOpenSalesDocument,
                    actions = actions,
                    setupVisible = setupVisible,
                    onDismissSetupProgress = onDismissSetupProgress,
                )
            }
        }
    }
}

/**
 * Picks the layout body for the active [DashboardStyle]. All three layouts
 * consume the same [DashboardLayoutBundle] — they only rearrange the same
 * widgets, never refetch them, so the dashboard data flow is unchanged.
 */
@Composable
private fun GlanceAndActDashboard(
    bundle: DashboardLayoutBundle,
    style: DashboardStyle,
    actions: DashboardActions,
    setupVisible: Boolean,
    onDismissSetupProgress: () -> Unit,
) {
    if (bundle.isEmpty) {
        EmptyTenantOnboarding(
            onAddCounterparty = actions.onOpenCounterpartyWizard,
            onAddProduct = actions.onOpenNewProduct,
        )
        return
    }
    // Bundle is non-empty: we have real data but some setup steps may still be undone.
    // The widget self-hides when all items are complete, so it's safe to always render it.
    val setupItems = buildSetupProgressItems(
        hasInvoice = bundle.activity.isNotEmpty(),
        actions = actions,
    )
    val anyUndone = setupItems.any { !it.done }
    // Only inject the setup card when there's something left to do AND the user
    // hasn't dismissed it. When either condition fails, fall through to the
    // normal layout path unchanged so established users see no extra chrome.
    if (anyUndone && setupVisible) {
        Column(modifier = Modifier.fillMaxSize()) {
            SetupProgressWidget(
                items = setupItems,
                onSkip = onDismissSetupProgress,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            )
            when (style) {
                DashboardStyle.HERO -> HeroLayout(bundle = bundle, actions = actions)
                DashboardStyle.PASTEL_BENTO -> PastelBentoLayout(bundle = bundle, actions = actions)
                DashboardStyle.CHARTS -> ChartsLayout(bundle = bundle, actions = actions)
            }
        }
    } else {
        when (style) {
            DashboardStyle.HERO -> HeroLayout(bundle = bundle, actions = actions)
            DashboardStyle.PASTEL_BENTO -> PastelBentoLayout(bundle = bundle, actions = actions)
            DashboardStyle.CHARTS -> ChartsLayout(bundle = bundle, actions = actions)
        }
    }
}

internal fun DashboardActions.dispatchActionTarget(target: ActionTarget) {
    when (target) {
        ActionTarget.OverdueReceivables, ActionTarget.UpcomingPayables -> onOpenCari()
        ActionTarget.LowStock -> onOpenInventory()
        ActionTarget.Unposted -> onOpenDocs()
    }
}

internal fun DashboardActions.dispatchActivityItem(item: ActivityListItem) {
    val href = item.href ?: return onOpenDocs()
    // Server shape: "/documents/{wireId}/{id}" where wireId is the dotted
    // module.name (e.g. "sales.invoice"). Two-segment shape kept as a
    // resilience fallback in case the server is rolled back to an older
    // emitter.
    val parts = href.trim('/').split('/')
    when {
        parts.size >= 3 && parts[0] == "documents" -> onOpenDocument(parts[1], parts[2])
        parts.size == 2 -> onOpenDocument(parts[0], parts[1])
        else -> onOpenDocs()
    }
}

internal fun DashboardActions.dispatchKpiTile(id: String) {
    when (id) {
        "kpi.receivables", "kpi.openInvoices", "kpi.thisMonthSales" -> onOpenCari()
        "kpi.payables" -> onOpenCari()
        "kpi.lowStockCount" -> onOpenInventory()
        else -> onOpenDocs()
    }
}

@Composable
@Suppress("LongMethod")
private fun LegacyDashboard(
    uiState: DashboardUiState,
    onRefresh: () -> Unit,
    onOpenSalesDocument: (String) -> Unit,
    actions: DashboardActions = DashboardActions(),
    setupVisible: Boolean = true,
    onDismissSetupProgress: () -> Unit = {},
) {
    when (val state = uiState) {
        is DashboardUiState.Loading -> {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }

        is DashboardUiState.Failed -> {
            ErrorState(
                icon = Icons.Filled.ErrorOutline,
                title = stringResource(R.string.error_title),
                message = stringResource(state.exception.stringRes()),
                ctaLabel = stringResource(R.string.action_retry),
                onCtaClick = onRefresh,
            )
        }

        is DashboardUiState.Loaded -> LegacyLoaded(
            state = state,
            onRefresh = onRefresh,
            onOpenSalesDocument = onOpenSalesDocument,
            actions = actions,
            setupVisible = setupVisible,
            onDismissSetupProgress = onDismissSetupProgress,
        )
    }
}

@Composable
private fun LegacyLoaded(
    state: DashboardUiState.Loaded,
    onRefresh: () -> Unit,
    onOpenSalesDocument: (String) -> Unit,
    actions: DashboardActions = DashboardActions(),
    setupVisible: Boolean = true,
    onDismissSetupProgress: () -> Unit = {},
) {
    if (state.recentDocuments.isEmpty()) {
        EmptyState(
            icon = Icons.Filled.Inbox,
            title = stringResource(dev.ishflow.android.appshared.R.string.empty_dashboard_title),
            message = stringResource(dev.ishflow.android.appshared.R.string.empty_dashboard_message),
            ctaLabel = stringResource(R.string.action_refresh),
            onCtaClick = onRefresh,
        )
        return
    }
    val setupItems = buildSetupProgressItems(
        hasInvoice = state.recentDocuments.isNotEmpty(),
        actions = actions,
    )
    LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        if (setupVisible) {
            item {
                SetupProgressWidget(
                    items = setupItems,
                    onSkip = onDismissSetupProgress,
                    modifier = Modifier.padding(vertical = 8.dp),
                )
            }
        }
        item { LegacyKpiCard(state) }
        item {
            Text(
                text = stringResource(R.string.recent_invoices),
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(top = 16.dp, bottom = 8.dp),
            )
        }
        items(state.recentDocuments) { doc ->
            DocumentRow(
                record = doc,
                modifier = Modifier.clickable { onOpenSalesDocument(doc.id) },
            )
        }
    }
}

@Composable
private fun LegacyKpiCard(state: DashboardUiState.Loaded) {
    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
        Column(modifier = Modifier.padding(16.dp)) {
            KPIRow(
                label = stringResource(R.string.kpi_receivable),
                value = formatCurrency(state.receivable),
                icon = Icons.Filled.ArrowDownward,
            )
            KPIRow(
                label = stringResource(R.string.kpi_payable),
                value = formatCurrency(state.payable),
                icon = Icons.Filled.ArrowUpward,
            )
            KPIRow(
                label = stringResource(R.string.kpi_stock),
                value = formatCurrency(state.stock),
                icon = Icons.Filled.Inventory,
            )
        }
    }
}

/**
 * Builds the ordered list of setup steps shown in [SetupProgressWidget].
 *
 * Done-derivation strategy (no extra API calls):
 * - `create_first_invoice`: derived from [hasInvoice] (activity slot non-empty /
 *   recentDocuments non-empty — both mean at least one invoice exists).
 * - All other items: default `done = false` until explicit counters are added
 *   to the dashboard response. The widget still helps users navigate even when
 *   only the invoice step can auto-complete.
 */
private fun buildSetupProgressItems(
    hasInvoice: Boolean,
    actions: DashboardActions,
): List<SetupProgressItem> = listOf(
    SetupProgressItem(
        id = "add_product",
        titleRes = R.string.setup_progress_add_product,
        done = false,
        onClick = actions.onOpenNewProduct,
    ),
    SetupProgressItem(
        id = "add_customer",
        titleRes = R.string.setup_progress_add_customer,
        done = false,
        onClick = actions.onOpenCari,
    ),
    SetupProgressItem(
        id = "create_first_invoice",
        titleRes = R.string.setup_progress_create_first_invoice,
        done = hasInvoice,
        onClick = actions.onOpenDocs,
    ),
    SetupProgressItem(
        id = "configure_prices",
        titleRes = R.string.setup_progress_configure_prices,
        done = false,
        onClick = actions.onOpenPrices,
    ),
    SetupProgressItem(
        id = "invite_team",
        titleRes = R.string.setup_progress_invite_team,
        done = false,
        onClick = actions.onOpenInviteTeam,
    ),
)

private fun formatCurrency(value: BigDecimal): String = NumberFormat.getCurrencyInstance().format(value)
