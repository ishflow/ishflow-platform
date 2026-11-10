import AppShared
import Cari
import Docs
import Inventory
import Purchases
import Sales
import Settings
import SwiftUI

/// Four-tab + center FAB shell shown after the user has signed in
/// and selected a tenant. Tabs are now driven by the server's `/me`
/// response (`session.tabs`).
struct MainTabView: View {
    @Environment(AppContainer.self) private var container
    @Environment(AppSession.self) private var session
    @Binding var pendingDeepLink: URL?
    let onSignOut: () -> Void
    let onSwitchTenant: (String) async -> Void

    @State private var selectedTab: String = "home"
    /// Tracks the most recently selected non-`.fab` tab so we can bounce
    /// back when the user taps the centered FAB sentinel.
    @State private var lastNonFABTab: String = "home"
    @State private var salesPresentNew = false
    /// Single deep-link sheet driver. Sales invoices render
    /// `SalesDetailView` (wizard-resume + Share); every other kind renders
    /// `DocumentDetailView`. Using one `.sheet(item:)` instead of two
    /// modifiers avoids SwiftUI's "two sheets on the same view" conflict
    /// that produced a blank presentation when both fired in sequence.
    @State private var deepLinkSummary: DocumentSummary?
    @State private var showFABMenu = false
    @State private var showMoreSheet = false
    @State private var showComingSoon = false
    @State private var showPaymentReceivedWizard = false
    @State private var showPurchaseInvoiceWizard = false
    @State private var showPaymentSentWizard = false
    @State private var showNotifCenter = false
    /// Bell-icon badge: open sync errors + a single offline-waiting alert.
    @State private var notifBadgeCount = 0
    @AppStorage("askedForNotifications") private var askedForNotifications = false
    @AppStorage(DashboardStyleStorage.key) private var dashboardStyleRaw: String = DashboardStyleStorage.defaultStyle.rawValue

    init(
        pendingDeepLink: Binding<URL?>,
        onSignOut: @escaping () -> Void,
        onSwitchTenant: @escaping (String) async -> Void
    ) {
        _pendingDeepLink = pendingDeepLink
        self.onSignOut = onSignOut
        self.onSwitchTenant = onSwitchTenant
    }

    var body: some View {
        if session.isRoleNotConfigured {
            RoleNotConfiguredView(
                onSwitchTenant: onSwitchTenant,
                onSignOut: onSignOut
            )
            .environment(session)
        } else {
            mainTabContent
        }
    }

    @ViewBuilder
    private var mainTabContent: some View {
        let tabs = session.tabs.isEmpty ? fallbackTabs : session.tabs

        TabView(selection: $selectedTab) {
            ForEach(tabs) { tab in
                Tab(
                    LocalizedStringKey(tab.labelKey),
                    systemImage: tab.icon,
                    value: tab.id
                ) {
                    tabView(for: tab.id)
                }
            }

            // FAB sentinel — only when the server grants at least one action.
            if !session.fabActions.isEmpty {
                // role: .search positions this Tab as a separate trailing
                // capsule on iPhone (and as a search field on iPad). We
                // semantically misuse the role to get the visual layout —
                // the actual action is intercepted in onChange(of:).
                Tab("shell.fab.label", systemImage: "plus", value: "fab", role: .search) {
                    Color.clear
                }
            }
        }
        .tabBarMinimizeBehavior(.onScrollDown)
        .tint(Color.accentColor)
        .environment(\.rootAvatarTap, { showMoreSheet = true })
        .onChange(of: selectedTab) { old, new in
            if new == "fab" {
                // Bounce: the sentinel tab is a button, not a destination.
                selectedTab = old
                showFABMenu = true
            } else {
                lastNonFABTab = new
                Task { await refreshNotifBadge() }
            }
        }
        .onChange(of: pendingDeepLink) { _, new in
            guard let url = new else { return }
            handleDeepLink(url)
        }
        .sheet(item: $deepLinkSummary) { summary in
            NavigationStack {
                if summary.kind == .salesInvoice {
                    SalesDetailView(api: container.api, id: summary.id)
                        .environment(\.shareConfiguration, container)
                } else {
                    DocumentDetailView(api: container.api, summary: summary)
                        .environment(\.shareConfiguration, container)
                }
            }
        }
        .popover(
            isPresented: $showFABMenu,
            attachmentAnchor: .point(UnitPoint(x: 0.875, y: 0.935)),
            arrowEdge: .bottom
        ) {
            // Stock entry/exit are desktop workflows — warehouse staff work at
            // a stationary scanner, not on a phone. Filter them out of the
            // server-driven action list before rendering the popover.
            // `customer` (Yeni müşteri) is filtered too — the dedicated
            // create-customer flow isn't wired on iOS yet.
            FABMenu(
                actions: session.fabActions.filter {
                    !["stockIn", "stockOut", "customer"].contains($0.id)
                },
                onSelect: handleNewDocumentSelection
            )
            .presentationCompactAdaptation(.popover)
        }
        .sheet(isPresented: $showPaymentReceivedWizard) {
            PaymentReceivedWizardView(api: container.api)
        }
        .sheet(isPresented: $showPurchaseInvoiceWizard) {
            PurchaseInvoiceWizardView(api: container.api)
        }
        .sheet(isPresented: $showPaymentSentWizard) {
            PaymentSentWizardView(api: container.api)
        }
        .sheet(isPresented: $showMoreSheet) {
            MoreSheet(
                api: container.api,
                onSignOut: onSignOut,
                onSwitchTenant: onSwitchTenant,
                fetchFailedMutations: { await container.syncQueue.failedMutations() },
                retryFailedMutation: { id in
                    await container.syncQueue.retryFailedMutation(id: id)
                }
            )
        }
        .sheet(isPresented: $showNotifCenter) {
            NotificationsCenterSheet(
                api: container.api,
                fetchFailedMutations: { await container.syncQueue.failedMutations() },
                retryFailedMutation: { id in
                    await container.syncQueue.retryFailedMutation(id: id)
                },
                fetchPendingMutations: { await container.syncQueue.pendingMutations() }
            )
        }
        .alert(
            Text("dashboard.comingSoon.title"),
            isPresented: $showComingSoon
        ) {
            Button("common.ok", role: .cancel) {}
        } message: {
            Text("dashboard.comingSoon.message")
        }
        .task {
            await refreshNotifBadge()
            #if !DEBUG
            // Skip the notification prompt in DEBUG — the system alert blocks
            // automated simulator testing. Release builds prompt as before.
            if !askedForNotifications {
                askedForNotifications = true
                _ = try? await container.pushService.requestAuthorizationAndRegister()
            }
            #endif
        }
        // Refresh the bell badge after the user reviews/clears the center, and
        // after each create flow closes (an offline/failed post lands there).
        .onChange(of: showNotifCenter) { _, shown in
            if !shown { Task { await refreshNotifBadge() } }
        }
        .onChange(of: showPaymentReceivedWizard) { _, shown in
            if !shown { Task { await refreshNotifBadge() } }
        }
        .onChange(of: showPurchaseInvoiceWizard) { _, shown in
            if !shown { Task { await refreshNotifBadge() } }
        }
        .onChange(of: showPaymentSentWizard) { _, shown in
            if !shown { Task { await refreshNotifBadge() } }
        }
    }

    /// Fallback tab list when the server omits tabs (very rare, defensive).
    private var fallbackTabs: [MobileTab] {
        [
            MobileTab(id: "home", icon: "house.fill", labelKey: "shell.tab.home", order: 1),
            MobileTab(id: "docs", icon: "doc.text.fill", labelKey: "shell.tab.docs", order: 2),
            MobileTab(id: "stock", icon: "cube.box.fill", labelKey: "shell.tab.stock", order: 3),
            MobileTab(id: "cari", icon: "person.2.fill", labelKey: "shell.tab.cari", order: 4),
        ]
    }

    @ViewBuilder
    private func tabView(for tabId: String) -> some View {
        switch tabId {
        case "home":
            homeTabView
        case "docs":
            DocsListView(api: container.api, presentNewSale: $salesPresentNew)
                .environment(\.shareConfiguration, container)
        case "stock":
            InventoryListView(api: container.api)
        case "cari":
            CariView(api: container.api)
        default:
            ContentUnavailableView {
                Label("shell.tab.unknown", systemImage: "questionmark.circle")
            }
        }
    }

    /// Routes the home tab through the user-selected dashboard variant.
    /// All variants share the same callbacks so deep-link / KPI / activity
    /// / notification behavior stays identical across layouts. Falls back
    /// to the default style when AppStorage is unset (first launch).
    @ViewBuilder
    private var homeTabView: some View {
        let style = DashboardStyle(rawValue: dashboardStyleRaw) ?? DashboardStyleStorage.defaultStyle
        switch style {
        case .v1Hero:
            HeroDashboardView(
                api: container.api,
                onNewSale: { showFABMenu = true },
                onCollect: { showPaymentReceivedWizard = true },
                onPay: { showPaymentSentWizard = true },
                onTapKPI: handleKPITap,
                onTapActivity: handleActivityTap,
                onSeeAll: handleSeeAll,
                onOpenNotifications: { showNotifCenter = true },
                notificationCount: notifBadgeCount
            )
        case .v2Bento:
            PastelBentoDashboardView(
                api: container.api,
                onNewSale: { showFABMenu = true },
                onTapKPI: handleKPITap,
                onTapActivity: handleActivityTap,
                onSeeAll: handleSeeAll,
                onOpenNotifications: { showNotifCenter = true },
                notificationCount: notifBadgeCount
            )
        case .v3Charts:
            ChartsDashboardView(
                api: container.api,
                onNewSale: { showFABMenu = true },
                onTapKPI: handleKPITap,
                onTapActivity: handleActivityTap,
                onSeeAll: handleSeeAll,
                onOpenNotifications: { showNotifCenter = true },
                onOpenLowStock: { selectedTab = "stock" },
                notificationCount: notifBadgeCount
            )
        }
    }

    /// Recompute the bell badge from the sync queue: one count per open sync
    /// error plus a single bump while anything is waiting offline.
    private func refreshNotifBadge() async {
        let failed = await container.syncQueue.failedMutations().count
        let pending = await container.syncQueue.pendingMutations().isEmpty ? 0 : 1
        notifBadgeCount = failed + pending
    }

    private func handleNewDocumentSelection(_ action: NewDocumentSheet.Action) {
        switch action {
        case .salesInvoice:
            selectedTab = "docs"
            salesPresentNew = true
        case .paymentReceived:
            showPaymentReceivedWizard = true
        case .purchaseInvoice:
            showPurchaseInvoiceWizard = true
        case .paymentSent:
            showPaymentSentWizard = true
        case .comingSoon:
            showComingSoon = true
        }
    }

    private func handleKPITap(_ kpi: DashboardView.DashboardKPI) {
        switch kpi {
        case .receivable, .thisMonthSales, .openInvoices:
            selectedTab = "docs"
        case .payable:
            showComingSoon = true
        }
    }

    private func handleActivityTap(_ item: DashboardSummary.ActivityItem) {
        // Parse `/documents/<kind>/<uuid>` from the activity item href.
        let parts = item.href.split(separator: "/").filter { !$0.isEmpty }
        guard parts.count >= 3, parts[0] == "documents",
              let kind = DocumentKind(rawValue: String(parts[1])),
              let id = UUID(uuidString: String(parts[2])) else {
            showComingSoon = true
            return
        }
        deepLinkSummary = DocumentSummary(
            id: id,
            kind: kind,
            displayNumber: item.label,
            date: item.eventDate ?? Date(),
            counterpartyName: nil,
            amount: nil,
            currency: nil,
            status: .posted
        )
    }

    private func handleSeeAll(_ section: DashboardView.DashboardSection) {
        switch section {
        case .upcomingReceivables, .recentActivity:
            selectedTab = "docs"
        }
    }

    private func handleDeepLink(_ url: URL) {
        guard url.scheme == "ishflow" else { return }
        let pathComponents = url.pathComponents.filter { $0 != "/" }

        // TODO(reports): `ishflow://reports/<type>` (emitted by the
        // "Bugünkü A/R" home-screen quick action in AppDelegate) currently
        // no-ops here. Pushing `ReportDetailView` would require importing
        // the `Reports` module into the app target, threading a second
        // `.sheet(item:)` (or a NavigationStack route) through this view,
        // and aligning URL slugs (`ar`/`ap`/`sales-customer`/`sales-product`/
        // `gross-profit`) with `ReportType.rawValue`. That work belongs to
        // T19 (MoreSheet → Reports wiring), which adds the module
        // dependency. Deferred per spec §7.6.

        guard pathComponents.count >= 3, pathComponents[0] == "documents" else { return }
        let docType = pathComponents[1]
        let docID = pathComponents[2]

        if let kind = DocumentKind(rawValue: docType), let uuid = UUID(uuidString: docID) {
            deepLinkSummary = DocumentSummary(
                id: uuid,
                kind: kind,
                displayNumber: "",
                date: Date(),
                counterpartyName: nil,
                amount: nil,
                currency: nil,
                status: .posted
            )
        }

        pendingDeepLink = nil
    }
}
