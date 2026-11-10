package dev.ishflow.android

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.add
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarDefaults
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SheetState
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.ViewModel
import androidx.navigation.NavController
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.appshared.models.FabAction
import dev.ishflow.android.appshared.models.MeResponse
import dev.ishflow.android.appshared.models.MobileTab
import dev.ishflow.android.core.notifications.NotificationsCenterSheet
import dev.ishflow.android.core.session.SessionStore
import dev.ishflow.android.core.ui.money.LocalTenantCurrency
import dev.ishflow.android.core.ui.AppSnackbarController
import dev.ishflow.android.core.ui.LocalShellActions
import dev.ishflow.android.core.ui.ShellActions
import dev.ishflow.android.core.ui.SnackbarRequest
import dev.ishflow.android.feature.cari.CariScreen
import dev.ishflow.android.feature.cari.detail.CounterpartyDetailScreen
import dev.ishflow.android.feature.dashboard.DashboardActions
import dev.ishflow.android.feature.dashboard.DashboardScreen
import dev.ishflow.android.appshared.models.DocumentStatus
import dev.ishflow.android.feature.docs.DocsListScreen
import dev.ishflow.android.feature.docs.DocumentKind
import dev.ishflow.android.feature.genericdoc.GenericDocDetailScreen
import dev.ishflow.android.feature.inventory.InventoryListScreen
import dev.ishflow.android.feature.inventory.ProductDetailScreen
import dev.ishflow.android.feature.inventory.scan.BarcodeScanScreen
import dev.ishflow.android.feature.prices.PriceDetailScreen
import dev.ishflow.android.feature.prices.PricesListScreen
import dev.ishflow.android.feature.purchases.PurchaseDetailScreen
import dev.ishflow.android.feature.purchases.PurchasesListScreen
import dev.ishflow.android.feature.purchases.wizard.PurchaseInvoiceWizardScreen
import dev.ishflow.android.feature.purchases.wizard.payment_sent.PaymentSentWizardScreenRoute
import dev.ishflow.android.feature.reports.ArAgingScreen
import dev.ishflow.android.feature.reports.GrossProfitScreen
import dev.ishflow.android.feature.reports.ReportsScreen
import dev.ishflow.android.feature.reports.SalesSummaryScreen
import dev.ishflow.android.feature.sales.SalesDetailScreen
import dev.ishflow.android.feature.sales.SalesInvoiceReceiptScreen
import dev.ishflow.android.feature.sales.SalesListScreen
import dev.ishflow.android.feature.sales.wizard.SalesWizardScreen
import dev.ishflow.android.feature.sales.wizard.payment_received.PaymentReceivedWizardScreenRoute
import dev.ishflow.android.feature.settings.NotificationsInboxScreen
import dev.ishflow.android.feature.settings.ProfileScreen
import dev.ishflow.android.feature.settings.SettingsRootScreen
import dev.ishflow.android.feature.settings.SyncErrorsScreen
import dev.ishflow.android.feature.settings.TenantSwitchScreen
import dev.ishflow.android.feature.settings.account.AccountSettingsScreen
import dev.ishflow.android.feature.settings.billing.BillingScreen
import dev.ishflow.android.feature.settings.outbox.OutboxScreen
import dev.ishflow.android.shell.openHelpFeedback
import dev.ishflow.android.shell.MoreSheet
import dev.ishflow.android.shell.MoreSheetAction
import dev.ishflow.android.shell.NewDocumentAction
import dev.ishflow.android.shell.NewDocumentSheet
import dev.ishflow.android.shell.clickableRow
import javax.inject.Inject
import kotlinx.coroutines.flow.SharedFlow

/**
 * Hilt-injected accessor that lets [MainScaffold] read the cached
 * [MeResponse] from [SessionStore] without owning a state class itself.
 *
 * The view-model layer is the cleanest seam to inject the singleton — a
 * direct `hiltViewModel<MainScaffoldViewModel>()` call inside the
 * composable keeps the shell free of constructor wiring.
 */
@HiltViewModel
class MainScaffoldViewModel @Inject constructor(
    sessionStore: SessionStore,
    val snackbarController: AppSnackbarController,
) : ViewModel() {
    val me = sessionStore.me
}

/**
 * Root navigation shell.
 *
 * The shell is driven from [SessionStore]'s cached [MeResponse]:
 *  - if the server emitted `tabs` / `fabActions` (PR #82 forward), they win
 *    and Android renders a server-supplied bottom bar + "+" sheet.
 *  - otherwise we fall back to the hard-coded 4-tab [TopDestination] list
 *    and the hand-rolled [NewDocumentSheet]. This keeps the current
 *    behaviour intact while PR #82 is unmerged.
 *
 * Deep-link routes (`sales/{id}`, `prices/{id}`, settings sub-pages,
 * wizards) stay registered even though their entry points moved out of the
 * bottom bar.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
@Suppress("LongMethod")
fun MainScaffold(documentDeepLinks: SharedFlow<DocumentDeepLink>, onSignOut: () -> Unit) {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    val viewModel: MainScaffoldViewModel = hiltViewModel()
    val me by viewModel.me.collectAsStateWithLifecycle()
    val badgeViewModel: dev.ishflow.android.core.notifications.NotificationBadgeViewModel = hiltViewModel()
    val notificationBadge by badgeViewModel.count.collectAsStateWithLifecycle()
    val snackbarController = viewModel.snackbarController
    val snackbarHostState = remember { SnackbarHostState() }

    SnackbarEventBridge(snackbarController, snackbarHostState)

    // Bridge `ishflow://documents/{kind}/{id}` from [MainActivity] into the
    // existing per-kind detail routes via [navigateToDoc]. The Activity
    // exposes a replay-1 SharedFlow so a deep link parsed in onCreate before
    // this collector attaches is still delivered on cold boot.
    LaunchedEffect(navController) {
        documentDeepLinks.collect { link ->
            navController.navigateToDoc(link.kind, link.id)
        }
    }

    var showNewDocSheet by remember { mutableStateOf(false) }
    var showMoreSheet by remember { mutableStateOf(false) }
    var showNotificationsCenter by remember { mutableStateOf(false) }
    val newDocSheetState = rememberModalBottomSheetState()
    val moreSheetState = rememberModalBottomSheetState()

    val serverTabs = me?.tabs?.takeIf { it.isNotEmpty() }
    val serverFabActions = me?.fabActions
    // Role-based FAB resolution:
    //  - `serverFabActions == null` → legacy MeResponse (pre-PR #82); fall
    //    through to the hard-coded [NewDocumentSheet] so the user is never
    //    stranded without create affordances.
    //  - non-null → trust the server's per-permission filter. Drop any ids
    //    the client can't navigate to yet (stockIn, stockOut, customer
    //    wizards aren't built) so we never render a sheet row that 404s.
    //  - resulting empty list → hide the "+" tab entirely (viewer role +
    //    warehouse-only stock actions both fall here today).
    val effectiveFabActions: List<FabAction>? = serverFabActions?.filter { it.id in SUPPORTED_FAB_IDS }
    val showFab = effectiveFabActions == null || effectiveFabActions.isNotEmpty()

    // Publish the shell's chrome callbacks so any feature screen rendering
    // its own AppTopBar can pull them from LocalShellActions.current without
    // a Hilt dependency.
    //
    // Wrap in `remember` keyed on the avatar source so every recomposition
    // doesn't rebuild fresh lambda identities — that would defeat the
    // `staticCompositionLocalOf` and force every consumer to recompose. The
    // sheet flags are `MutableState` setters (stable references), so they
    // don't need to participate in the key.
    val firstName = me?.user?.firstName
    val shellActions = remember(firstName, notificationBadge) {
        ShellActions(
            onAvatarClick = { showMoreSheet = true },
            onBellClick = { showNotificationsCenter = true },
            avatarInitial = firstName?.firstOrNull()?.uppercase() ?: "U",
            notificationBadge = notificationBadge,
        )
    }

    CompositionLocalProvider(
        LocalShellActions provides shellActions,
        LocalTenantCurrency provides me?.tenant?.currency.orEmpty(),
    ) {
        Scaffold(
            bottomBar = {
                BottomNavBar(
                    navController = navController,
                    currentRoute = currentRoute,
                    serverTabs = serverTabs,
                    showNewDocItem = showFab,
                    onNewDocClick = { showNewDocSheet = true },
                )
            },
            snackbarHost = { SnackbarHost(snackbarHostState) },
        ) { padding ->
            Box(modifier = Modifier.padding(padding)) {
                AppNavHost(
                    navController = navController,
                    onSignOut = onSignOut,
                )
            }
        }
    }

    if (showNewDocSheet) {
        if (effectiveFabActions != null) {
            ServerFabSheet(
                sheetState = newDocSheetState,
                actions = effectiveFabActions,
                onAction = { actionId ->
                    showNewDocSheet = false
                    navController.handleServerFabAction(actionId)
                },
                onDismiss = { showNewDocSheet = false },
            )
        } else {
            NewDocumentSheet(
                sheetState = newDocSheetState,
                onAction = { action ->
                    showNewDocSheet = false
                    navController.handleNewDocumentAction(action)
                },
                onDismiss = { showNewDocSheet = false },
            )
        }
    }
    if (showMoreSheet) {
        val context = androidx.compose.ui.platform.LocalContext.current
        MoreSheet(
            sheetState = moreSheetState,
            onAction = { action ->
                showMoreSheet = false
                when (action) {
                    MoreSheetAction.Notifications -> {
                        showNotificationsCenter = true
                    }
                    MoreSheetAction.HelpAndFeedback -> {
                        openHelpFeedback(context = context, tenantSlug = me?.tenant?.slug)
                    }
                    MoreSheetAction.SignOut -> onSignOut()
                    else -> navController.handleMoreSheetAction(action)
                }
            },
            onDismiss = { showMoreSheet = false },
        )
    }
    if (showNotificationsCenter) {
        NotificationsCenterSheet(onDismiss = { showNotificationsCenter = false })
    }
}

/**
 * Collects [AppSnackbarController.events] and forwards each request to the
 * scaffold's [SnackbarHostState]. Resource snackbars are resolved against the
 * current [androidx.compose.ui.platform.LocalContext] so callers stay
 * Compose-free.
 */
@Composable
private fun SnackbarEventBridge(
    controller: AppSnackbarController,
    snackbarHostState: SnackbarHostState,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    LaunchedEffect(controller) {
        controller.events.collect { request ->
            val message = when (request) {
                is SnackbarRequest.Text -> request.message
                is SnackbarRequest.Resource -> context.getString(request.res, *request.args.toTypedArray())
            }
            snackbarHostState.showSnackbar(message)
        }
    }
}

private val TOP_LEVEL_ROUTES = setOf("dashboard", "docs", "inventory", "cari")

/**
 * FAB action ids the Android client can currently navigate to. The backend
 * emits more (stockIn, stockOut, customer) for warehouse + sales roles, but
 * the matching wizards aren't built yet — filter them out at the edge so
 * the sheet never offers a row that would 404 in [handleServerFabAction].
 * When a new wizard ships, add its id here AND in `handleServerFabAction`.
 */
private val SUPPORTED_FAB_IDS = setOf(
    "salesInvoice",
    "paymentReceived",
    "purchaseInvoice",
    "paymentSent",
)

/**
 * Resolved descriptor for one navigation slot. Server-driven path carries the
 * tab-specific icon override (so a `home`/`docs` swap on the server side still
 * picks up the right glyph). Local fallback inherits the icon directly from
 * [TopDestination].
 */
private data class BottomNavSlot(
    val descriptor: TopDestination,
    val icon: ImageVector,
)

@Composable
private fun BottomNavBar(
    navController: NavHostController,
    currentRoute: String?,
    serverTabs: List<MobileTab>?,
    showNewDocItem: Boolean,
    onNewDocClick: () -> Unit,
) {
    val slots: List<BottomNavSlot> = if (serverTabs != null) {
        serverTabs.sortedBy { it.order }.mapNotNull { tab ->
            val descriptor = tabDescriptor(tab) ?: return@mapNotNull null
            BottomNavSlot(descriptor = descriptor, icon = materialIcon(tab.icon))
        }
    } else {
        TopDestination.all.map { BottomNavSlot(descriptor = it, icon = it.icon) }
    }

    // Center "+" item lands between left-half tabs and right-half tabs.
    // For the canonical 4-tab list (Home, Docs, Stock, Cari) that produces
    // Home · Docs · + · Stock · Cari. Empty slot list still renders a bare
    // "+" so the user is never stranded without a primary action.
    val insertAt = slots.size / 2

    NavigationBar(
        windowInsets = NavigationBarDefaults.windowInsets
            .add(WindowInsets(left = 12.dp, right = 12.dp)),
    ) {
        slots.forEachIndexed { index, slot ->
            if (showNewDocItem && index == insertAt) {
                NewDocBarItem(onClick = onNewDocClick)
            }
            val label = stringResource(slot.descriptor.labelRes)
            NavigationBarItem(
                selected = currentRoute == slot.descriptor.route,
                onClick = { navController.navigateTopLevel(slot.descriptor.route) },
                icon = {
                    Icon(
                        slot.icon,
                        contentDescription = label,
                        modifier = Modifier.size(28.dp),
                    )
                },
                label = null,
            )
        }
        // Edge case: empty slot list (insertAt == 0 above renders the item
        // first; this branch covers insertAt == slots.size when slots is
        // non-empty but odd-sized, e.g. 3 → +`Home · Docs · + · Cari`).
        if (showNewDocItem && slots.isNotEmpty() && insertAt == slots.size) {
            NewDocBarItem(onClick = onNewDocClick)
        }
    }
}

/**
 * Action-only navigation bar item that opens [NewDocumentSheet]. Replaces the
 * docked center FAB from Faz 1 — see spec
 * `2026-05-12-android-dashboard-redesign-design.md` §1. Never enters a
 * `selected` state because the "+" doesn't represent a destination.
 */
@Composable
private fun RowScope.NewDocBarItem(onClick: () -> Unit) {
    NavigationBarItem(
        selected = false,
        onClick = onClick,
        icon = {
            Icon(
                imageVector = Icons.Filled.AddCircle,
                contentDescription = stringResource(R.string.shell_fab_label),
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(32.dp),
            )
        },
        label = null,
    )
}

/**
 * Resolves a server-emitted [MobileTab] to a local [TopDestination]. Unknown
 * ids drop out of the bar (forward-compat for tabs the client cannot
 * render yet).
 */
private fun tabDescriptor(tab: MobileTab): TopDestination? = when (tab.id) {
    "home" -> TopDestination.Home
    "docs" -> TopDestination.Docs
    "stock", "inventory" -> TopDestination.Stock
    "cari", "counterparties" -> TopDestination.Cari
    else -> null
}

/**
 * Server-driven version of [NewDocumentSheet]. Falls back transparently
 * when [actions] is null in [MainScaffold].
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ServerFabSheet(
    sheetState: SheetState,
    actions: List<FabAction>,
    onAction: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        val knownIds = setOf("salesInvoice", "paymentReceived", "purchaseInvoice", "paymentSent")
        actions.filter { it.id in knownIds }.sortedBy { it.order }.forEach { action ->
            val label = stringResource(fabLabelRes(action.id))
            ServerFabRow(
                icon = materialIcon(action.icon),
                label = label,
                onClick = { onAction(action.id) },
            )
        }
        Spacer(modifier = Modifier.height(24.dp))
    }
}

@Composable
private fun ServerFabRow(icon: ImageVector, label: String, onClick: () -> Unit) {
    ListItem(
        headlineContent = { Text(label) },
        leadingContent = { Icon(icon, contentDescription = null) },
        modifier = Modifier.clickableRow(onClick),
    )
}

/** FAB action id → Android string resource. Unknown ids fall back to the generic FAB label. */
private fun fabLabelRes(id: String): Int = when (id) {
    "salesInvoice" -> R.string.new_doc_sales_invoice
    "paymentReceived" -> R.string.new_doc_payment_received
    "purchaseInvoice" -> R.string.new_doc_purchase_invoice
    "paymentSent" -> R.string.new_doc_payment_sent
    else -> R.string.fab_new_document
}

private fun NavController.navigateTopLevel(route: String) {
    // Strip any non-tab destination layered on top (wizard, detail screen,
    // settings sub-page, etc.) BEFORE the tab switch. With `saveState=true`,
    // Compose Navigation otherwise persists the wizard inside the tab's
    // saved-state cache; the next `restoreState=true` then reattaches it
    // and the user gets stranded on the wizard when tapping a tab.
    while (true) {
        val current = currentBackStackEntry?.destination?.route
        if (current == null || current in TOP_LEVEL_ROUTES) break
        if (!popBackStack()) break
    }
    navigate(route) {
        popUpTo(graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}

// Pushing "docs" before the wizard would poison the saved-state cache used
// by `navigateTopLevel` — tapping the Docs tab from inside a wizard would
// restore the wizard right back on top of docs. We open wizards directly
// instead; `onDone = popBackStack` returns the user to whichever tab they
// launched from (Home/Docs/Cari/Stock).
private fun NavController.handleNewDocumentAction(action: NewDocumentAction) {
    val route = when (action) {
        NewDocumentAction.SalesInvoice -> "sales/wizard"
        NewDocumentAction.PaymentReceived -> "sales/payment_received/wizard"
        NewDocumentAction.PurchaseInvoice -> "purchases/invoice/wizard"
        NewDocumentAction.PaymentSent -> "purchases/payment_sent/wizard"
    }
    navigate(route)
}

private fun NavController.handleServerFabAction(actionId: String) {
    val route = when (actionId) {
        "salesInvoice" -> "sales/wizard"
        "paymentReceived" -> "sales/payment_received/wizard"
        "purchaseInvoice" -> "purchases/invoice/wizard"
        "paymentSent" -> "purchases/payment_sent/wizard"
        else -> return
    }
    navigate(route)
}

private fun NavController.handleMoreSheetAction(action: MoreSheetAction) {
    when (action) {
        MoreSheetAction.Settings -> navigate("settings")
        MoreSheetAction.Reports -> navigate("reports")
        MoreSheetAction.TenantSwitch -> navigate("settings/tenant")
        // The remaining actions are handled at the MoreSheet call site in
        // [MainScaffold] (Notifications opens a sheet, HelpAndFeedback fires
        // a system intent, SignOut delegates to the host's `onSignOut`).
        MoreSheetAction.Notifications,
        MoreSheetAction.HelpAndFeedback,
        MoreSheetAction.SignOut -> Unit
    }
}

@Composable
@Suppress("LongMethod")
private fun AppNavHost(
    navController: NavHostController,
    onSignOut: () -> Unit,
) {
    NavHost(navController = navController, startDestination = TopDestination.Home.route) {
        composable(TopDestination.Home.route) {
            DashboardScreen(
                actions = DashboardActions(
                    onOpenDocs = { navController.navigateTopLevel(TopDestination.Docs.route) },
                    onOpenCari = { navController.navigateTopLevel(TopDestination.Cari.route) },
                    onOpenInventory = { navController.navigateTopLevel(TopDestination.Stock.route) },
                    onOpenDocument = { kind, id -> navController.navigateToDoc(kind, id) },
                    onOpenSalesDocument = { id -> navController.navigate("sales/$id") },
                    onOpenCounterpartyWizard = {
                        navController.navigateTopLevel(TopDestination.Cari.route)
                    },
                    onOpenNewProduct = {
                        navController.navigateTopLevel(TopDestination.Stock.route)
                    },
                ),
            )
        }
        composable(TopDestination.Docs.route) {
            DocsListScreen(
                onRowClick = { summary ->
                    when {
                        summary.kind == DocumentKind.SalesInvoice &&
                            summary.status == DocumentStatus.POSTED ->
                            navController.navigate("sales/receipt/${summary.id}")
                        // DRAFT and SAVED are both "not yet posted" — both must
                        // reopen the wizard so the user can keep editing and
                        // decide between Сохранить (stay editable) and Провести
                        // (promote to POSTED). Without SAVED here the wizard is
                        // skipped and the old SalesDetailScreen renders instead.
                        summary.kind == DocumentKind.SalesInvoice &&
                            (summary.status == DocumentStatus.DRAFT ||
                                summary.status == DocumentStatus.SAVED) ->
                            navController.navigate("sales/wizard?draftId=${summary.id}")
                        else -> navController.navigateToDoc(summary.kind.wireId, summary.id)
                    }
                },
            )
        }
        composable(TopDestination.Stock.route) { InventoryRoute(navController) }
        composable(TopDestination.Cari.route) {
            CariScreen(
                onCounterpartyClick = { id, type ->
                    navController.navigate("cari/$type/$id")
                },
            )
        }
        composable(
            "cari/{type}/{id}",
            arguments = listOf(
                navArgument("type") { type = NavType.StringType },
                navArgument("id") { type = NavType.StringType },
            ),
        ) { CounterpartyDetailScreen() }
        composable("sales") {
            SalesListScreen(
                onDocumentClick = { id -> navController.navigate("sales/$id") },
                onNewInvoice = { navController.navigate("sales/wizard") },
            )
        }
        composable(
            "sales/{id}",
            arguments = listOf(navArgument("id") { type = NavType.StringType }),
        ) {
            SalesDetailScreen(
                onContinueDraft = { id ->
                    navController.navigate("sales/wizard?draftId=$id")
                },
                onOpenSales = { id ->
                    navController.navigate("sales/$id")
                },
            )
        }
        composable(
            "sales/receipt/{id}",
            arguments = listOf(navArgument("id") { type = NavType.StringType }),
        ) {
            val id = it.arguments?.getString("id").orEmpty()
            SalesInvoiceReceiptScreen(
                invoiceId = id,
                onBack = { navController.popBackStack() },
            )
        }
        composable(
            "sales/wizard?draftId={draftId}",
            arguments = listOf(
                navArgument("draftId") { defaultValue = ""; nullable = true },
            ),
        ) {
            SalesWizardScreen(onDone = { navController.popBackStack() })
        }
        composable("sales/payment_received/wizard") {
            PaymentReceivedWizardScreenRoute(onDone = { navController.popBackStack() })
        }
        composable("purchases") {
            PurchasesListScreen(
                onDocumentClick = { id -> navController.navigate("purchases/$id") },
                onNewInvoice = { navController.navigate("purchases/invoice/wizard") },
            )
        }
        composable(
            "purchases/{id}",
            arguments = listOf(navArgument("id") { type = NavType.StringType }),
        ) {
            PurchaseDetailScreen(
                onContinueDraft = { id ->
                    navController.navigate("purchases/invoice/wizard?draftId=$id")
                },
                onOpenPurchase = { id ->
                    navController.navigate("purchases/$id")
                },
            )
        }
        composable(
            "doc/{module}/{name}/{id}",
            arguments = listOf(
                navArgument("module") { type = NavType.StringType },
                navArgument("name") { type = NavType.StringType },
                navArgument("id") { type = NavType.StringType },
            ),
        ) {
            GenericDocDetailScreen()
        }
        composable(
            "purchases/invoice/wizard?draftId={draftId}",
            arguments = listOf(
                navArgument("draftId") { defaultValue = ""; nullable = true },
            ),
        ) {
            PurchaseInvoiceWizardScreen(onDone = { navController.popBackStack() })
        }
        composable("purchases/payment_sent/wizard") {
            PaymentSentWizardScreenRoute(onDone = { navController.popBackStack() })
        }
        composable("prices") {
            PricesListScreen(onPriceClick = { id -> navController.navigate("prices/$id") })
        }
        composable(
            "prices/{id}",
            arguments = listOf(navArgument("id") { type = NavType.StringType }),
        ) { PriceDetailScreen() }
        composable("settings") {
            SettingsRootScreen(
                onNavigate = { route -> navController.navigate(route) },
                onSignOut = onSignOut,
            )
        }
        composable("settings/profile") {
            ProfileScreen(
                onBack = { navController.popBackStack() },
                onOpenTenantSwitch = { navController.navigate("settings/tenant") },
            )
        }
        composable("settings/tenant") {
            TenantSwitchScreen(
                onBack = { navController.popBackStack() },
                // Skip the Settings root on the way out so a successful
                // switch lands the user back on Dashboard immediately.
                onSwitched = {
                    navController.popBackStack(TopDestination.Home.route, inclusive = false)
                },
            )
        }
        composable("settings/notifications") {
            NotificationsInboxScreen(onBack = { navController.popBackStack() })
        }
        composable("settings/syncErrors") {
            SyncErrorsScreen(onBack = { navController.popBackStack() })
        }
        composable("settings/outbox") {
            OutboxScreen(onBack = { navController.popBackStack() })
        }
        composable("settings/billing") {
            BillingScreen(onBack = { navController.popBackStack() })
        }
        composable("settings/account") {
            AccountSettingsScreen(
                onBack = { navController.popBackStack() },
                onAccountDeleted = onSignOut,
            )
        }
        composable("inventory/scan") {
            BarcodeScanScreen(onScan = { navController.popBackStack() })
        }
        composable(
            "inventory/detail?productId={productId}&productName={productName}&warehouse={warehouse}&quantity={quantity}",
            arguments = listOf(
                navArgument("productId") { type = NavType.StringType; defaultValue = "" },
                navArgument("productName") { type = NavType.StringType; nullable = true; defaultValue = null },
                navArgument("warehouse") { type = NavType.StringType; nullable = true; defaultValue = null },
                navArgument("quantity") { type = NavType.StringType; nullable = true; defaultValue = null },
            ),
        ) {
            ProductDetailScreen(
                onOpenDocument = { kind, id -> navController.navigateToDoc(kind, id) },
            )
        }
        composable("reports") {
            ReportsScreen(onOpen = { route -> navController.navigate(route) })
        }
        composable("reports/sales-summary") {
            SalesSummaryScreen(onBack = { navController.popBackStack() })
        }
        composable("reports/ar-aging") {
            ArAgingScreen(onBack = { navController.popBackStack() })
        }
        composable("reports/gross-profit") {
            GrossProfitScreen(onBack = { navController.popBackStack() })
        }
    }
}

@Composable
private fun InventoryRoute(navController: NavHostController) {
    InventoryListScreen(
        onProductClick = { productId, productName, warehouse, quantity ->
            val encodedId = java.net.URLEncoder.encode(productId, "UTF-8")
            val encodedName = java.net.URLEncoder.encode(productName, "UTF-8")
            val encodedWarehouse = java.net.URLEncoder.encode(warehouse, "UTF-8")
            val encodedQuantity = java.net.URLEncoder.encode(quantity, "UTF-8")
            val route = "inventory/detail" +
                "?productId=$encodedId" +
                "&productName=$encodedName" +
                "&warehouse=$encodedWarehouse" +
                "&quantity=$encodedQuantity"
            navController.navigate(route)
        },
        onScanClick = { navController.navigate("inventory/scan") },
    )
}

private fun NavController.navigateToDoc(wireId: String, id: String) {
    when (wireId) {
        // Route to the new receipt detail (same as the Docs list for posted
        // sales invoices), not the legacy SalesDetailScreen. Dashboard
        // "Recent activity" + notification deep links land here, and previously
        // opened the old design while the Docs list opened the new one.
        "sales.invoice" -> navigate("sales/receipt/$id")
        "purchases.invoice" -> navigate("purchases/$id")
        else -> {
            // Generic detail for payment_received / payment_sent and any other
            // doc kind that doesn't have a dedicated screen yet. The dot is
            // split so Compose Nav can match `doc/{module}/{name}/{id}`.
            val parts = wireId.split('.', limit = 2)
            if (parts.size == 2) navigate("doc/${parts[0]}/${parts[1]}/$id")
        }
    }
}

