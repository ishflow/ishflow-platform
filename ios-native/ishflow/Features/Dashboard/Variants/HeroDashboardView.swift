import APIClient
import AppShared
import SwiftUI

/// **V1 — Banking Hero.** Mirrors a minimalist banking-app dashboard:
/// big balance card up top, three pill actions, then a transactions
/// list grouped by day. Reuses the same `DashboardViewModel` and
/// callback enums as `DashboardView`, so MainTabView wires both with
/// the same handlers.
struct HeroDashboardView: View {
    @Environment(AppSession.self) private var session
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.tenantSwitch) private var tenantSwitch
    @State private var viewModel: DashboardViewModel?
    @State private var showOrgSwitcher: Bool = false
    private let api: any APIClient
    private let isPreview: Bool

    var onNewSale: () -> Void
    var onCollect: () -> Void
    var onPay: () -> Void
    var onTapKPI: (DashboardView.DashboardKPI) -> Void
    var onTapActivity: (DashboardSummary.ActivityItem) -> Void
    var onSeeAll: (DashboardView.DashboardSection) -> Void
    var onOpenNotifications: () -> Void
    var notificationCount: Int

    init(
        api: any APIClient,
        onNewSale: @escaping () -> Void = {},
        onCollect: @escaping () -> Void = {},
        onPay: @escaping () -> Void = {},
        onTapKPI: @escaping (DashboardView.DashboardKPI) -> Void = { _ in },
        onTapActivity: @escaping (DashboardSummary.ActivityItem) -> Void = { _ in },
        onSeeAll: @escaping (DashboardView.DashboardSection) -> Void = { _ in },
        onOpenNotifications: @escaping () -> Void = {},
        notificationCount: Int = 0
    ) {
        self.api = api
        self.isPreview = false
        self.onNewSale = onNewSale
        self.onCollect = onCollect
        self.onPay = onPay
        self.onTapKPI = onTapKPI
        self.onTapActivity = onTapActivity
        self.onSeeAll = onSeeAll
        self.onOpenNotifications = onOpenNotifications
        self.notificationCount = notificationCount
    }

    var body: some View {
        NavigationStack {
            content
                .navigationBarTitleDisplayMode(.inline)
                .refreshable { await viewModel?.refresh() }
                .task {
                    guard !isPreview else { return }
                    if viewModel == nil {
                        viewModel = DashboardViewModel(api: api, session: session)
                    }
                    await viewModel?.load()
                }
                .onChange(of: scenePhase) { _, phase in
                    if phase == .active { Task { await viewModel?.load() } }
                }
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) { notificationsButton }
                        .sharedBackgroundVisibility(.hidden)
                    ToolbarItem(placement: .topBarTrailing) { tenantBadge }
                        .sharedBackgroundVisibility(.hidden)
                }
                .rootToolbar()
                .sheet(isPresented: $showOrgSwitcher) {
                    OrganizationSwitcherSheet(
                        memberships: session.memberships,
                        onPick: { tenantId in
                            showOrgSwitcher = false
                            Task { await tenantSwitch(tenantId) }
                        },
                        onCancel: { showOrgSwitcher = false }
                    )
                    .presentationDetents([.medium, .large])
                }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel?.state {
        case .none, .idle, .loading:
            loadingView
        case .empty:
            emptyCard
        case let .failed(msg):
            ContentUnavailableView {
                Label("dashboard.error.title", systemImage: "exclamationmark.triangle")
            } description: {
                Text(LocalizedStringKey(msg))
            } actions: {
                Button("dashboard.error.retry") {
                    Task { await viewModel?.load() }
                }
            }
        case let .loaded(layout):
            loaded(layout)
        }
    }

    // MARK: - Loaded

    @ViewBuilder
    private func loaded(_ layout: DashboardLayout) -> some View {
        let currency = layout.tenant?.currency ?? session.tenant?.currency ?? "USD"
        let heroWidgets = layout.layout.first(where: { $0.slot == .hero })?.widgets ?? []
        let activityWidgets = layout.layout.first(where: { $0.slot == .activity })?.widgets ?? []
        let primary = primaryWidget(in: heroWidgets)
        let secondaries = secondaryWidgets(in: heroWidgets, excluding: primary)

        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                welcomeHeader
                    .padding(.horizontal, 20)
                    .padding(.top, 4)

                heroBalanceCard(
                    primary: primary,
                    secondaries: secondaries,
                    currency: currency
                )
                .padding(.horizontal, 20)

                pillActionRow
                    .padding(.horizontal, 20)

                transactionsSection(activityWidgets)
                    .padding(.top, 8)
            }
            .padding(.vertical, 12)
        }
        .scrollIndicators(.hidden)
        .background(Color(.systemGroupedBackground))
    }

    // MARK: - Welcome header

    private var welcomeHeader: some View {
        HStack(spacing: 12) {
            AvatarCircle(user: session.user, diameter: 44)
            VStack(alignment: .leading, spacing: 2) {
                Text("dashboard.hero.welcomeBack")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text(displayName)
                    .font(.headline)
                    .lineLimit(1)
            }
            Spacer()
        }
    }

    // MARK: - Hero balance card

    @ViewBuilder
    private func heroBalanceCard(
        primary: DashboardLayout.Widget?,
        secondaries: [DashboardLayout.Widget],
        currency: String
    ) -> some View {
        let (titleKey, valueText, deltaPct, deltaKey, kpi) =
            primary.map { meta(for: $0, currency: currency) } ??
            (LocalizedStringKey("dashboard.kpi.cashPosition"), "—", 0, LocalizedStringKey(""), nil)

        VStack(alignment: .leading, spacing: 18) {
            // Top row: tenant chip + currency badge
            HStack(spacing: 10) {
                tenantChip
                Spacer()
                Text(currency)
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(.thinMaterial, in: Capsule())
            }

            VStack(alignment: .leading, spacing: 6) {
                Text(titleKey)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text(valueText)
                    .font(.system(size: 38, weight: .bold, design: .rounded).monospacedDigit())
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                if deltaPct != 0 {
                    deltaPill(delta: deltaPct, key: deltaKey)
                }
            }

            if !secondaries.isEmpty {
                Divider()
                heroSecondaries(secondaries, currency: currency)
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(Color(.secondarySystemGroupedBackground))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(Color.primary.opacity(0.06), lineWidth: 0.5)
        )
        .contentShape(RoundedRectangle(cornerRadius: 24))
        .onTapGesture { if let kpi { onTapKPI(kpi) } }
    }

    private var tenantChip: some View {
        let tenantName = session.tenant?.name ?? "—"
        let initial = String(tenantName.prefix(1)).uppercased()
        return HStack(spacing: 8) {
            ZStack {
                Circle().fill(.tint.opacity(0.18))
                Text(initial)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(.tint)
            }
            .frame(width: 28, height: 28)
            Text(tenantName)
                .font(.subheadline.weight(.semibold))
                .lineLimit(1)
        }
    }

    @ViewBuilder
    private func heroSecondaries(
        _ widgets: [DashboardLayout.Widget],
        currency: String
    ) -> some View {
        // Show up to two secondary stats side-by-side beneath the big number.
        let pair = Array(widgets.prefix(2))
        HStack(alignment: .top, spacing: 16) {
            ForEach(Array(pair.enumerated()), id: \.element.id) { index, widget in
                let (labelKey, value, _, _, kpi) = meta(for: widget, currency: currency)
                Button {
                    if let kpi { onTapKPI(kpi) }
                } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(labelKey)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                        Text(value)
                            .font(.title3.weight(.semibold).monospacedDigit())
                            .foregroundStyle(.primary)
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .buttonStyle(.plain)
                if index == 0, pair.count == 2 {
                    Divider().frame(height: 36)
                }
            }
        }
    }

    @ViewBuilder
    private func deltaPill(delta: Double, key: LocalizedStringKey) -> some View {
        let isUp = delta > 0
        HStack(spacing: 4) {
            Image(systemName: isUp ? "arrow.up.right" : "arrow.down.right")
            Text("\(Int(delta.rounded()))% ") + Text(key).foregroundStyle(.secondary)
        }
        .font(.caption.weight(.semibold))
        .foregroundStyle(isUp ? Color.green : Color.red)
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(
            Capsule().fill((isUp ? Color.green : Color.red).opacity(0.12))
        )
    }

    // MARK: - Pill actions

    private var pillActionRow: some View {
        HStack(spacing: 12) {
            actionPill(
                titleKey: "dashboard.action.collect",
                systemImage: "arrow.down.left",
                action: onCollect
            )
            actionPill(
                titleKey: "dashboard.action.pay",
                systemImage: "arrow.up.right",
                action: onPay
            )
            roundFAB
        }
    }

    private func actionPill(
        titleKey: LocalizedStringKey,
        systemImage: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            action()
        }) {
            HStack(spacing: 8) {
                Image(systemName: systemImage)
                    .font(.subheadline.weight(.semibold))
                Text(titleKey)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, minHeight: 48)
            .background(
                Capsule().fill(Color(.secondarySystemGroupedBackground))
            )
            .overlay(
                Capsule().stroke(Color.primary.opacity(0.06), lineWidth: 0.5)
            )
            .foregroundStyle(.primary)
        }
        .buttonStyle(.plain)
    }

    private var roundFAB: some View {
        Button {
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            onNewSale()
        } label: {
            Image(systemName: "plus")
                .font(.title3.weight(.bold))
                .foregroundStyle(.white)
                .frame(width: 48, height: 48)
                .background(Circle().fill(Color.green))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text("shell.fab.label"))
    }

    // MARK: - Transactions section

    @ViewBuilder
    private func transactionsSection(_ widgets: [DashboardLayout.Widget]) -> some View {
        let recent = widgets.first(where: { $0.id == "list.recentActivity" })
        let items = recent?.listItems ?? []
        if items.isEmpty { EmptyView() } else {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .firstTextBaseline) {
                    Text("dashboard.transactions")
                        .font(.title3.weight(.bold))
                    Spacer()
                    Button {
                        onSeeAll(.recentActivity)
                    } label: {
                        Text("dashboard.seeAll")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.tint)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 20)

                VStack(spacing: 0) {
                    let visible = Array(items.prefix(6))
                    ForEach(Array(visible.enumerated()), id: \.element.id) { index, item in
                        if index > 0 {
                            Divider().padding(.leading, 60)
                        }
                        ActivityFeedRow(item: item.asActivityItem) {
                            onTapActivity(item.asActivityItem)
                        }
                        .padding(.horizontal, 16)
                    }
                }
                .background(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .fill(Color(.secondarySystemGroupedBackground))
                )
                .padding(.horizontal, 20)
            }
        }
    }

    // MARK: - Empty / loading / toolbar

    private var emptyCard: some View {
        VStack(spacing: 16) {
            Spacer(minLength: 40)
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 60))
                .foregroundStyle(.tint)
            Text("dashboard.empty.title")
                .font(.title2.weight(.bold))
                .multilineTextAlignment(.center)
            Text("dashboard.empty.message")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button { onNewSale() } label: {
                Text("dashboard.empty.cta")
                    .font(.headline)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
            }
            .buttonStyle(.borderedProminent)
            .tint(.orange)
            .padding(.top, 8)
            Spacer()
        }
        .padding(.horizontal, 32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var loadingView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                RoundedRectangle(cornerRadius: 12)
                    .fill(.gray.opacity(0.15))
                    .frame(height: 48)
                    .padding(.horizontal, 20)
                RoundedRectangle(cornerRadius: 24)
                    .fill(.gray.opacity(0.15))
                    .frame(height: 200)
                    .padding(.horizontal, 20)
                HStack(spacing: 12) {
                    Capsule().fill(.gray.opacity(0.15)).frame(height: 48)
                    Capsule().fill(.gray.opacity(0.15)).frame(height: 48)
                    Circle().fill(.gray.opacity(0.15)).frame(width: 48, height: 48)
                }
                .padding(.horizontal, 20)
                RoundedRectangle(cornerRadius: 20)
                    .fill(.gray.opacity(0.15))
                    .frame(height: 220)
                    .padding(.horizontal, 20)
            }
            .padding(.vertical, 12)
        }
        .scrollIndicators(.hidden)
        .background(Color(.systemGroupedBackground))
        .redacted(reason: .placeholder)
    }

    private var notificationsButton: some View {
        NotificationBellButton(count: notificationCount, action: onOpenNotifications)
    }

    @ViewBuilder
    private var tenantBadge: some View {
        let tenantName = session.tenant?.name ?? "—"
        let initial = String(tenantName.prefix(1)).uppercased()
        let hasOptions = session.memberships.count > 1
        Button {
            if hasOptions { showOrgSwitcher = true }
        } label: {
            ZStack {
                Circle().fill(.tint.opacity(0.15))
                Text(initial)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.tint)
            }
            .frame(width: 32, height: 32)
            .clipShape(Circle())
            .overlay(Circle().stroke(Color(.separator), lineWidth: 0.5))
        }
        .buttonStyle(.plain)
        .disabled(!hasOptions)
        .accessibilityLabel(Text(tenantName))
    }

    // MARK: - Helpers

    private var displayName: String {
        let first = session.user?.firstName ?? ""
        let last  = session.user?.lastName ?? ""
        let composed = "\(first) \(last)".trimmingCharacters(in: .whitespaces)
        if !composed.isEmpty { return composed }
        return session.user?.email ?? ""
    }

    /// Pick the most balance-like widget for the hero. Priority:
    /// cashPosition → thisMonthSales → first hero widget. Returns nil if
    /// the role had no hero widgets at all (rare).
    private func primaryWidget(in heroes: [DashboardLayout.Widget]) -> DashboardLayout.Widget? {
        if let cash = heroes.first(where: { $0.id == "kpi.cashPosition" }) { return cash }
        if let sales = heroes.first(where: { $0.id == "kpi.thisMonthSales" }) { return sales }
        return heroes.first
    }

    private func secondaryWidgets(
        in heroes: [DashboardLayout.Widget],
        excluding primary: DashboardLayout.Widget?
    ) -> [DashboardLayout.Widget] {
        guard let primary else { return [] }
        return heroes.filter { $0.id != primary.id }
    }

    /// Subset of `DashboardView.kpiMeta` shaped for the V1 layout (no glyph,
    /// no nullable label key). Drift here is intentional — V1 owns its own
    /// presentation rules.
    private func meta(
        for widget: DashboardLayout.Widget,
        currency: String
    ) -> (LocalizedStringKey, String, Double, LocalizedStringKey, DashboardView.DashboardKPI?) {
        switch widget.id {
        case "kpi.receivables":
            let v = Decimal(string: widget.kpiValue ?? "0") ?? .zero
            return ("dashboard.kpi.receivable",
                    v.formatted(.currency(code: currency)),
                    widget.kpiDelta ?? 0,
                    "dashboard.delta.vs30Days",
                    .receivable)
        case "kpi.payables":
            let v = Decimal(string: widget.kpiValue ?? "0") ?? .zero
            return ("dashboard.kpi.payable",
                    v.formatted(.currency(code: currency)),
                    widget.kpiDelta ?? 0,
                    "dashboard.delta.vs30Days",
                    .payable)
        case "kpi.thisMonthSales":
            let v = Decimal(string: widget.kpiValue ?? "0") ?? .zero
            return ("dashboard.kpi.thisMonthSales",
                    v.formatted(.currency(code: currency)),
                    widget.kpiDelta ?? 0,
                    "dashboard.delta.vsLastMonth",
                    .thisMonthSales)
        case "kpi.openInvoices":
            return ("dashboard.kpi.openInvoices",
                    "\(widget.kpiCount ?? 0)",
                    widget.kpiDelta ?? 0,
                    "dashboard.delta.vs7Days",
                    .openInvoices)
        case "kpi.cashPosition":
            let v = Decimal(string: widget.kpiValue ?? "0") ?? .zero
            return ("dashboard.kpi.cashPosition",
                    v.formatted(.currency(code: currency)),
                    widget.kpiDelta ?? 0,
                    "dashboard.delta.vs30Days",
                    nil)
        case "kpi.stockValue":
            return ("dashboard.kpi.stockValue",
                    "\(widget.kpiCount ?? Int(widget.kpiValue ?? "0") ?? 0)",
                    widget.kpiDelta ?? 0,
                    "",
                    nil)
        case "kpi.todayMovements":
            return ("dashboard.kpi.todayMovements",
                    "\(widget.kpiCount ?? Int(widget.kpiValue ?? "0") ?? 0)",
                    widget.kpiDelta ?? 0, "", nil)
        case "kpi.weekMovements":
            return ("dashboard.kpi.weekMovements",
                    "\(widget.kpiCount ?? Int(widget.kpiValue ?? "0") ?? 0)",
                    widget.kpiDelta ?? 0, "", nil)
        default:
            // Generic fallback: show whatever the backend sent so a brand-new
            // role/widget combination doesn't surface as "—". Label is the
            // widget id (until a localized key lands), value is whichever of
            // kpiValue / kpiCount the payload carries.
            let value: String
            if let raw = widget.kpiValue, !raw.isEmpty {
                value = raw
            } else if let count = widget.kpiCount {
                value = "\(count)"
            } else {
                value = "—"
            }
            return (LocalizedStringKey(widget.id), value, widget.kpiDelta ?? 0, "", nil)
        }
    }
}
