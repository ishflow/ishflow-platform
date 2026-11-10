import APIClient
import AppShared
import SwiftUI

struct DashboardView: View {
    @Environment(AppSession.self) private var session
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.tenantSwitch) private var tenantSwitch
    @State private var viewModel: DashboardViewModel?
    @State private var showOrgSwitcher: Bool = false
    private let api: any APIClient
    private let isPreview: Bool

    /// Tapped on the orange "+" FAB.
    var onNewSale: () -> Void
    /// Tapped on the low-stock banner.
    var onOpenLowStock: () -> Void
    /// Tapped on a KPI card. The card's identifier tells the parent which
    /// destination to route to (or which alert to surface).
    var onTapKPI: (DashboardKPI) -> Void
    /// Tapped on an upcoming receivable row. Always a sales invoice.
    var onTapUpcomingReceivable: (DashboardSummary.UpcomingReceivable) -> Void
    /// Tapped on a recent activity row. The parent inspects `item.href` to
    /// decide whether to push a real screen or surface a coming-soon alert.
    var onTapActivity: (DashboardSummary.ActivityItem) -> Void
    /// Tapped on a section header's "See all" link.
    var onSeeAll: (DashboardSection) -> Void

    enum DashboardKPI {
        case receivable
        case payable
        case thisMonthSales
        case openInvoices
    }

    enum DashboardSection {
        case upcomingReceivables
        case recentActivity
    }

    init(
        api: any APIClient,
        onNewSale: @escaping () -> Void = {},
        onOpenLowStock: @escaping () -> Void = {},
        onTapKPI: @escaping (DashboardKPI) -> Void = { _ in },
        onTapUpcomingReceivable: @escaping (DashboardSummary.UpcomingReceivable) -> Void = { _ in },
        onTapActivity: @escaping (DashboardSummary.ActivityItem) -> Void = { _ in },
        onSeeAll: @escaping (DashboardSection) -> Void = { _ in }
    ) {
        self.api = api
        self.isPreview = false
        self.onNewSale = onNewSale
        self.onOpenLowStock = onOpenLowStock
        self.onTapKPI = onTapKPI
        self.onTapUpcomingReceivable = onTapUpcomingReceivable
        self.onTapActivity = onTapActivity
        self.onSeeAll = onSeeAll
    }

    init(
        api: any APIClient,
        previewViewModel: DashboardViewModel,
        onNewSale: @escaping () -> Void = {},
        onOpenLowStock: @escaping () -> Void = {},
        onTapKPI: @escaping (DashboardKPI) -> Void = { _ in },
        onTapUpcomingReceivable: @escaping (DashboardSummary.UpcomingReceivable) -> Void = { _ in },
        onTapActivity: @escaping (DashboardSummary.ActivityItem) -> Void = { _ in },
        onSeeAll: @escaping (DashboardSection) -> Void = { _ in }
    ) {
        self.api = api
        self.isPreview = true
        self._viewModel = State(initialValue: previewViewModel)
        self.onNewSale = onNewSale
        self.onOpenLowStock = onOpenLowStock
        self.onTapKPI = onTapKPI
        self.onTapUpcomingReceivable = onTapUpcomingReceivable
        self.onTapActivity = onTapActivity
        self.onSeeAll = onSeeAll
    }

    var body: some View {
        NavigationStack {
            content
                .navigationTitle(Text("dashboard.title"))
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
                    ToolbarItem(placement: .topBarTrailing) {
                        tenantBadge()
                    }
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
            emptyDashboardCard()
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
            loadedView(layout: layout)
        }
    }

    @ViewBuilder
    private func loadedView(layout: DashboardLayout) -> some View {
        let currency = layout.tenant?.currency ?? session.tenant?.currency ?? "USD"
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 24) {
                // hero — first hero widget = full-width prominent card; the rest = 2×2 grid
                if let heroSection = layout.layout.first(where: { $0.slot == .hero }) {
                    kpiGrid(widgets: heroSection.widgets, currency: currency)
                }

                // action queue — combines all `actions` slot widgets, hides if empty
                if let actionsSection = layout.layout.first(where: { $0.slot == .actions }),
                   !actionsSection.widgets.isEmpty {
                    actionQueueSection(actionsSection.widgets)
                }

                // recent activity
                if let activitySection = layout.layout.first(where: { $0.slot == .activity }),
                   !activitySection.widgets.isEmpty {
                    recentActivitySection(activitySection.widgets, currency: currency)
                }
            }
            .padding(.vertical)
        }
        .scrollIndicators(.hidden)
    }

    // MARK: - New section stubs (Tasks 6–11 will fill these in)

    @ViewBuilder
    private func kpiGrid(widgets: [DashboardLayout.Widget], currency: String) -> some View {
        let twoCol = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]
        let threeCol = [
            GridItem(.flexible(), spacing: 8),
            GridItem(.flexible(), spacing: 8),
            GridItem(.flexible(), spacing: 8),
        ]

        Group {
            switch widgets.count {
            case 0:
                EmptyView()
            case 1:
                kpiTile(widgets[0], currency: currency, prominent: true)
            case 2:
                LazyVGrid(columns: twoCol, spacing: 12) {
                    ForEach(widgets) { kpiTile($0, currency: currency, prominent: false) }
                }
            case 3:
                LazyVGrid(columns: threeCol, spacing: 8) {
                    ForEach(widgets) { kpiTile($0, currency: currency, prominent: false) }
                }
            case 4:
                LazyVGrid(columns: twoCol, spacing: 12) {
                    ForEach(widgets) { kpiTile($0, currency: currency, prominent: false) }
                }
            default:
                // 5+: first widget full-width prominent, rest in 2×2 grid (current owner experience).
                VStack(spacing: 12) {
                    kpiTile(widgets[0], currency: currency, prominent: true)
                    LazyVGrid(columns: twoCol, spacing: 12) {
                        ForEach(Array(widgets.dropFirst().prefix(4))) {
                            kpiTile($0, currency: currency, prominent: false)
                        }
                    }
                }
            }
        }
        .padding(.horizontal, 16)
    }

    @ViewBuilder
    private func kpiTile(
        _ widget: DashboardLayout.Widget,
        currency: String,
        prominent: Bool = false
    ) -> some View {
        let (labelKey, value, delta, deltaKey, _, _) = kpiMeta(for: widget, currency: currency)
        Button {
            handleTileTap(widget, currency: currency)
        } label: {
            VStack(alignment: .leading, spacing: prominent ? 6 : 4) {
                Text(labelKey)
                    .font(prominent ? .caption.weight(.medium) : .caption)
                    .foregroundStyle(.secondary)
                    .textCase(prominent ? .uppercase : nil)
                    .lineLimit(1)
                Text(value)
                    .font(
                        prominent
                            ? .largeTitle.weight(.bold).monospacedDigit()
                            : .title2.weight(.bold).monospacedDigit()
                    )
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                if delta != 0 {
                    if prominent {
                        deltaLabel(delta: delta, key: deltaKey)
                    } else {
                        Label("\(Int(delta))%", systemImage: delta > 0 ? "arrow.up.right" : "arrow.down.right")
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(delta > 0 ? Color.green : Color.red)
                    }
                }
            }
            .frame(maxWidth: .infinity, minHeight: prominent ? 110 : 80, alignment: .leading)
            .padding(prominent ? 16 : 12)
            .background(
                prominent
                    ? AnyShapeStyle(.regularMaterial)
                    : AnyShapeStyle(.ultraThinMaterial),
                in: RoundedRectangle(cornerRadius: prominent ? 20 : 16)
            )
        }
        .buttonStyle(.plain)
    }

    private func handleTileTap(_ widget: DashboardLayout.Widget, currency: String) {
        let (_, _, _, _, _, kpiType) = kpiMeta(for: widget, currency: currency)
        if let kpiType {
            onTapKPI(kpiType)
        }
        // Hero-only widgets (e.g. `kpi.cashPosition`) have nil kpiType — no-op tap by design.
    }

    @ViewBuilder
    private func deltaLabel(delta: Double, key: LocalizedStringKey) -> some View {
        let isUp = delta > 0
        HStack(spacing: 4) {
            Image(systemName: isUp ? "arrow.up.right" : "arrow.down.right")
            Text("\(Int(delta.rounded()))% ") + Text(key).foregroundStyle(.secondary)
        }
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(isUp ? Color.green : Color.red)
    }

    @ViewBuilder
    private func actionQueueSection(_ widgets: [DashboardLayout.Widget]) -> some View {
        let rows = queueRows(from: widgets)
        if !rows.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Text("dashboard.attention.section")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)
                    .padding(.horizontal, 16)

                VStack(spacing: 0) {
                    ForEach(Array(rows.enumerated()), id: \.element.id) { index, row in
                        if index > 0 {
                            Divider().padding(.leading, 56)
                        }
                        queueRow(row)
                    }
                }
                .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
                .padding(.horizontal, 16)
            }
        }
    }

    private struct QueueRow: Identifiable {
        let id: String
        let icon: String
        let labelKey: String
        let count: Int
        let action: () -> Void
    }

    private func queueRows(from widgets: [DashboardLayout.Widget]) -> [QueueRow] {
        var rows: [QueueRow] = []

        // Order: overdue → low stock → unposted → upcoming payables (by urgency)
        if let w = widgets.first(where: { $0.id == "action.upcomingReceivables" }) {
            let overdueCount = w.listItems.filter(isOverdue).count
            if overdueCount > 0 {
                rows.append(QueueRow(
                    id: w.id,
                    icon: "clock.badge.exclamationmark",
                    labelKey: "dashboard.queue.overdueReceivables",
                    count: overdueCount,
                    action: { onSeeAll(.upcomingReceivables) }
                ))
            }
        }

        if let w = widgets.first(where: { $0.id == "action.lowStock" }), let count = w.kpiCount, count > 0 {
            rows.append(QueueRow(
                id: w.id,
                icon: "shippingbox",
                labelKey: "dashboard.queue.lowStock",
                count: count,
                action: { onOpenLowStock() }
            ))
        }

        if let w = widgets.first(where: { $0.id == "action.unposted" }), let count = w.kpiCount, count > 0 {
            rows.append(QueueRow(
                id: w.id,
                icon: "doc.badge.clock",
                labelKey: "dashboard.queue.unposted",
                count: count,
                action: { /* deep-link to unposted filter; out of scope for this PR */ }
            ))
        }

        if let w = widgets.first(where: { $0.id == "action.upcomingPayables" }), !w.listItems.isEmpty {
            rows.append(QueueRow(
                id: w.id,
                icon: "creditcard",
                labelKey: "dashboard.queue.upcomingPayables",
                count: w.listItems.count,
                action: { /* deep-link; out of scope for this PR */ }
            ))
        }

        return rows
    }

    private func isOverdue(_ item: DashboardLayout.Widget.ListItem) -> Bool {
        guard let raw = item.date else { return false }
        let comps = raw.split(separator: "-")
        guard comps.count == 3,
              let y = Int(comps[0]), let m = Int(comps[1]), let d = Int(comps[2]) else {
            return false
        }
        let cal = Calendar.current
        guard let due = cal.date(from: DateComponents(year: y, month: m, day: d)) else { return false }
        return due < cal.startOfDay(for: Date())
    }

    @ViewBuilder
    private func queueRow(_ row: QueueRow) -> some View {
        Button(action: row.action) {
            HStack(spacing: 14) {
                Image(systemName: row.icon)
                    .font(.body)
                    .frame(width: 28, height: 28)
                    .foregroundStyle(.tint)
                // The catalog values are "%lld …" format strings — substitute the count
                // into the placeholder rather than prepending it and leaving %lld raw.
                Text(String(format: NSLocalizedString(row.labelKey, comment: ""), row.count))
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.tertiary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private func recentActivitySection(_ widgets: [DashboardLayout.Widget], currency: String) -> some View {
        if let recent = widgets.first(where: { $0.id == "list.recentActivity" }), !recent.listItems.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("dashboard.recentActivity")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.secondary)
                        .textCase(.uppercase)
                    Spacer()
                    Button {
                        onSeeAll(.recentActivity)
                    } label: {
                        HStack(spacing: 2) {
                            Text("dashboard.seeAll")
                            Image(systemName: "chevron.right").font(.caption2.weight(.bold))
                        }
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.tint)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 16)

                VStack(spacing: 0) {
                    let items = Array(recent.listItems.prefix(5))
                    ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                        if index > 0 {
                            Divider().padding(.leading, 56)
                        }
                        ActivityFeedRow(item: item.asActivityItem) {
                            onTapActivity(item.asActivityItem)
                        }
                    }
                }
                .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
                .padding(.horizontal, 16)
            }
        }
    }

    @ViewBuilder
    private func emptyDashboardCard() -> some View {
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

            Button {
                onNewSale()
            } label: {
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

    @ViewBuilder
    private func tenantBadge() -> some View {
        let tenantName = session.tenant?.name ?? "—"
        let initial = String(tenantName.prefix(1)).uppercased()
        let hasOptions = session.memberships.count > 1

        Button {
            if hasOptions { showOrgSwitcher = true }
        } label: {
            initialCircle(initial)
                .frame(width: 32, height: 32)
                .clipShape(Circle())
                .overlay(Circle().stroke(Color(.separator), lineWidth: 0.5))
        }
        .buttonStyle(.plain)
        .disabled(!hasOptions)
        .accessibilityLabel(Text(tenantName))
        .accessibilityHint(hasOptions ? Text("orgSwitcher.a11yHint") : Text(""))
    }

    @ViewBuilder
    private func initialCircle(_ initial: String) -> some View {
        ZStack {
            Circle().fill(.tint.opacity(0.15))
            Text(initial)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(.tint)
        }
    }

    private func kpiMeta(
        for widget: DashboardLayout.Widget,
        currency: String
    ) -> (LocalizedStringKey, String, Double, LocalizedStringKey, String, DashboardKPI?) {
        switch widget.id {
        case "kpi.receivables":
            let v = Decimal(string: widget.kpiValue ?? "0") ?? .zero
            return (
                "dashboard.kpi.receivable",
                v.formatted(.currency(code: currency)),
                widget.kpiDelta ?? 0,
                "dashboard.delta.vs30Days",
                "arrow.down.left.circle",
                .receivable
            )
        case "kpi.payables":
            let v = Decimal(string: widget.kpiValue ?? "0") ?? .zero
            return (
                "dashboard.kpi.payable",
                v.formatted(.currency(code: currency)),
                widget.kpiDelta ?? 0,
                "dashboard.delta.vs30Days",
                "arrow.up.right.circle",
                .payable
            )
        case "kpi.thisMonthSales":
            let v = Decimal(string: widget.kpiValue ?? "0") ?? .zero
            return (
                "dashboard.kpi.thisMonthSales",
                v.formatted(.currency(code: currency)),
                widget.kpiDelta ?? 0,
                "dashboard.delta.vsLastMonth",
                "chart.line.uptrend.xyaxis",
                .thisMonthSales
            )
        case "kpi.openInvoices":
            return (
                "dashboard.kpi.openInvoices",
                "\(widget.kpiCount ?? 0)",
                widget.kpiDelta ?? 0,
                "dashboard.delta.vs7Days",
                "doc.text",
                .openInvoices
            )
        case "kpi.cashPosition":
            let v = Decimal(string: widget.kpiValue ?? "0") ?? .zero
            return (
                "dashboard.kpi.cashPosition",
                v.formatted(.currency(code: currency)),
                widget.kpiDelta ?? 0,
                "dashboard.delta.vs30Days",
                "banknote",
                nil
            )
        default:
            return ("", "0", 0, "", "questionmark.circle", nil)
        }
    }

    private var loadingView: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Hero skeleton
                RoundedRectangle(cornerRadius: 20)
                    .fill(.gray.opacity(0.15))
                    .frame(height: 110)
                    .padding(.horizontal, 16)

                // 2x2 KPI grid skeleton
                LazyVGrid(
                    columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)],
                    spacing: 12
                ) {
                    ForEach(0 ..< 4, id: \.self) { _ in
                        RoundedRectangle(cornerRadius: 16)
                            .fill(.gray.opacity(0.15))
                            .frame(height: 80)
                    }
                }
                .padding(.horizontal, 16)

                // List skeleton
                RoundedRectangle(cornerRadius: 16)
                    .fill(.gray.opacity(0.15))
                    .frame(height: 140)
                    .padding(.horizontal, 16)
            }
            .padding(.vertical)
        }
        .scrollIndicators(.hidden)
        .redacted(reason: .placeholder)
    }
}

// MARK: - ListItem adapters

extension DashboardLayout.Widget.ListItem {
    var asUpcomingReceivable: DashboardSummary.UpcomingReceivable {
        DashboardSummary.UpcomingReceivable(
            id: id,
            name: name ?? "",
            amount: DecimalString(stringLiteral: amount ?? "0"),
            date: date ?? ""
        )
    }

    var asActivityItem: DashboardSummary.ActivityItem {
        DashboardSummary.ActivityItem(
            id: id,
            kind: kind ?? "",
            label: label ?? "",
            href: href ?? "",
            timestamp: timestamp ?? ""
        )
    }
}
