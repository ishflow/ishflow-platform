import APIClient
import AppShared
import Charts
import SwiftUI

/// **V2 — Pastel Bento.** Reference: Image #14 left. A bento grid where
/// the most important KPI fills a tall mint tile (with a sparkline if the
/// backend ships chart data), and supporting KPIs sit as smaller pastel
/// chips. Below: a transactions list with rounded icon containers.
struct PastelBentoDashboardView: View {
    @Environment(AppSession.self) private var session
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.tenantSwitch) private var tenantSwitch
    @State private var viewModel: DashboardViewModel?
    @State private var showOrgSwitcher: Bool = false
    private let api: any APIClient
    private let isPreview: Bool

    var onNewSale: () -> Void
    var onTapKPI: (DashboardView.DashboardKPI) -> Void
    var onTapActivity: (DashboardSummary.ActivityItem) -> Void
    var onSeeAll: (DashboardView.DashboardSection) -> Void
    var onOpenNotifications: () -> Void
    var notificationCount: Int

    init(
        api: any APIClient,
        onNewSale: @escaping () -> Void = {},
        onTapKPI: @escaping (DashboardView.DashboardKPI) -> Void = { _ in },
        onTapActivity: @escaping (DashboardSummary.ActivityItem) -> Void = { _ in },
        onSeeAll: @escaping (DashboardView.DashboardSection) -> Void = { _ in },
        onOpenNotifications: @escaping () -> Void = {},
        notificationCount: Int = 0
    ) {
        self.api = api
        self.isPreview = false
        self.onNewSale = onNewSale
        self.onTapKPI = onTapKPI
        self.onTapActivity = onTapActivity
        self.onSeeAll = onSeeAll
        self.onOpenNotifications = onOpenNotifications
        self.notificationCount = notificationCount
    }

    /// Pastel palette used across tiles. SF system colors carry their own
    /// dark-mode treatment, so opacity-driven backgrounds adapt for free.
    private struct PastelPalette {
        let mint = Color.mint
        let peach = Color.orange
        let lavender = Color.purple
        let sky = Color.teal
    }

    private let palette = PastelPalette()

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
        let heroes = layout.layout.first(where: { $0.slot == .hero })?.widgets ?? []
        let activity = layout.layout.first(where: { $0.slot == .activity })?.widgets ?? []
        let trendPoints = layout.layout
            .first(where: { $0.slot == .trends })?
            .widgets.first?.chartPoints ?? []

        let big = primaryWidget(in: heroes)
        let chips = secondaryWidgets(in: heroes, excluding: big)

        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                helloHeader
                    .padding(.horizontal, 20)
                    .padding(.top, 4)

                bentoGrid(big: big, chips: chips, trendPoints: trendPoints, currency: currency)
                    .padding(.horizontal, 20)

                transactionsSection(activity)
                    .padding(.top, 4)
            }
            .padding(.vertical, 12)
        }
        .scrollIndicators(.hidden)
        .background(Color(.systemGroupedBackground))
    }

    private var helloHeader: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text("dashboard.hero.welcomeBack")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text(displayName)
                    .font(.title2.weight(.bold))
                    .lineLimit(1)
            }
            Spacer()
            AvatarCircle(user: session.user, diameter: 44)
        }
    }

    // MARK: - Bento grid

    @ViewBuilder
    private func bentoGrid(
        big: DashboardLayout.Widget?,
        chips: [DashboardLayout.Widget],
        trendPoints: [DashboardLayout.Widget.ChartPoint],
        currency: String
    ) -> some View {
        let pair = Array(chips.prefix(2))
        let extras = Array(chips.dropFirst(2).prefix(2))

        HStack(alignment: .top, spacing: 12) {
            // Tall left column = big mint tile
            if let big {
                bigMintTile(widget: big, points: trendPoints, currency: currency)
                    .frame(maxWidth: .infinity)
            }
            // Right column = two stacked pastel chips
            VStack(spacing: 12) {
                if pair.indices.contains(0) {
                    pastelChip(widget: pair[0], color: palette.peach, currency: currency)
                }
                if pair.indices.contains(1) {
                    pastelChip(widget: pair[1], color: palette.lavender, currency: currency)
                }
            }
            .frame(maxWidth: .infinity)
        }

        if !extras.isEmpty {
            HStack(spacing: 12) {
                ForEach(Array(extras.enumerated()), id: \.element.id) { index, widget in
                    let color: Color = index == 0 ? palette.sky : palette.mint
                    pastelChip(widget: widget, color: color, currency: currency)
                        .frame(maxWidth: .infinity)
                }
            }
        }
    }

    private func bigMintTile(
        widget: DashboardLayout.Widget,
        points: [DashboardLayout.Widget.ChartPoint],
        currency: String
    ) -> some View {
        let (labelKey, value, _, _, kpi) = meta(for: widget, currency: currency)
        return Button {
            if let kpi { onTapKPI(kpi) }
        } label: {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: "chart.bar.xaxis")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(palette.mint)
                        .padding(8)
                        .background(Circle().fill(.white.opacity(0.6)))
                    Spacer()
                }
                Spacer(minLength: 0)
                if !points.isEmpty {
                    sparkline(points: points, color: palette.mint)
                        .frame(height: 60)
                } else {
                    fakeBars(color: palette.mint)
                        .frame(height: 60)
                }
                Text(value)
                    .font(.title3.weight(.bold).monospacedDigit())
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                Text(labelKey)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
            .padding(16)
            .frame(maxWidth: .infinity, minHeight: 220, alignment: .topLeading)
            .background(
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .fill(palette.mint.opacity(0.18))
            )
        }
        .buttonStyle(.plain)
    }

    private func pastelChip(
        widget: DashboardLayout.Widget,
        color: Color,
        currency: String
    ) -> some View {
        let (labelKey, value, _, _, kpi) = meta(for: widget, currency: currency)
        return Button {
            if let kpi { onTapKPI(kpi) }
        } label: {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: glyph(for: widget.id))
                        .font(.footnote.weight(.bold))
                        .foregroundStyle(color)
                        .padding(6)
                        .background(Circle().fill(.white.opacity(0.7)))
                    Spacer()
                }
                Spacer(minLength: 0)
                Text(labelKey)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                Text(value)
                    .font(.headline.weight(.bold).monospacedDigit())
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
            }
            .padding(14)
            .frame(maxWidth: .infinity, minHeight: 104, alignment: .topLeading)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(color.opacity(0.18))
            )
        }
        .buttonStyle(.plain)
    }

    private func sparkline(
        points: [DashboardLayout.Widget.ChartPoint],
        color: Color
    ) -> some View {
        Chart {
            ForEach(Array(points.enumerated()), id: \.offset) { _, point in
                LineMark(
                    x: .value("date", point.date),
                    y: .value("value", point.value)
                )
                .interpolationMethod(.monotone)
                .foregroundStyle(color)
                AreaMark(
                    x: .value("date", point.date),
                    y: .value("value", point.value)
                )
                .interpolationMethod(.monotone)
                .foregroundStyle(
                    LinearGradient(
                        colors: [color.opacity(0.35), color.opacity(0.0)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
            }
        }
        .chartXAxis(.hidden)
        .chartYAxis(.hidden)
        .chartLegend(.hidden)
    }

    /// Decorative bar set used when the backend has not yet shipped trend
    /// data for this role. Keeps the tile from looking empty.
    private func fakeBars(color: Color) -> some View {
        let heights: [CGFloat] = [0.45, 0.7, 0.55, 0.85, 0.62, 1.0, 0.78]
        return GeometryReader { geo in
            HStack(alignment: .bottom, spacing: 6) {
                ForEach(Array(heights.enumerated()), id: \.offset) { _, h in
                    RoundedRectangle(cornerRadius: 4)
                        .fill(color.opacity(0.7))
                        .frame(height: max(8, geo.size.height * h))
                }
            }
        }
    }

    private func glyph(for widgetId: String) -> String {
        switch widgetId {
        case "kpi.receivables": return "arrow.down.left"
        case "kpi.payables": return "arrow.up.right"
        case "kpi.thisMonthSales": return "chart.line.uptrend.xyaxis"
        case "kpi.openInvoices": return "doc.text"
        case "kpi.cashPosition": return "banknote"
        default: return "circle"
        }
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

                VStack(spacing: 8) {
                    ForEach(Array(items.prefix(6)), id: \.id) { item in
                        Button {
                            onTapActivity(item.asActivityItem)
                        } label: {
                            ActivityFeedRow(item: item.asActivityItem)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 6)
                                .background(
                                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                                        .fill(Color(.secondarySystemGroupedBackground))
                                )
                        }
                        .buttonStyle(.plain)
                    }
                }
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
            VStack(spacing: 16) {
                RoundedRectangle(cornerRadius: 12)
                    .fill(.gray.opacity(0.15))
                    .frame(height: 56)
                    .padding(.horizontal, 20)
                HStack(alignment: .top, spacing: 12) {
                    RoundedRectangle(cornerRadius: 22).fill(.gray.opacity(0.15)).frame(height: 220)
                    VStack(spacing: 12) {
                        RoundedRectangle(cornerRadius: 18).fill(.gray.opacity(0.15)).frame(height: 104)
                        RoundedRectangle(cornerRadius: 18).fill(.gray.opacity(0.15)).frame(height: 104)
                    }
                }
                .padding(.horizontal, 20)
                RoundedRectangle(cornerRadius: 16)
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

    private func primaryWidget(in heroes: [DashboardLayout.Widget]) -> DashboardLayout.Widget? {
        if let s = heroes.first(where: { $0.id == "kpi.thisMonthSales" }) { return s }
        if let c = heroes.first(where: { $0.id == "kpi.cashPosition" }) { return c }
        return heroes.first
    }

    private func secondaryWidgets(
        in heroes: [DashboardLayout.Widget],
        excluding primary: DashboardLayout.Widget?
    ) -> [DashboardLayout.Widget] {
        guard let primary else { return [] }
        return heroes.filter { $0.id != primary.id }
    }

    private func meta(
        for widget: DashboardLayout.Widget,
        currency: String
    ) -> (LocalizedStringKey, String, Double, LocalizedStringKey, DashboardView.DashboardKPI?) {
        switch widget.id {
        case "kpi.receivables":
            let v = Decimal(string: widget.kpiValue ?? "0") ?? .zero
            return ("dashboard.kpi.receivable", v.formatted(.currency(code: currency)),
                    widget.kpiDelta ?? 0, "dashboard.delta.vs30Days", .receivable)
        case "kpi.payables":
            let v = Decimal(string: widget.kpiValue ?? "0") ?? .zero
            return ("dashboard.kpi.payable", v.formatted(.currency(code: currency)),
                    widget.kpiDelta ?? 0, "dashboard.delta.vs30Days", .payable)
        case "kpi.thisMonthSales":
            let v = Decimal(string: widget.kpiValue ?? "0") ?? .zero
            return ("dashboard.kpi.thisMonthSales", v.formatted(.currency(code: currency)),
                    widget.kpiDelta ?? 0, "dashboard.delta.vsLastMonth", .thisMonthSales)
        case "kpi.openInvoices":
            return ("dashboard.kpi.openInvoices", "\(widget.kpiCount ?? 0)",
                    widget.kpiDelta ?? 0, "dashboard.delta.vs7Days", .openInvoices)
        case "kpi.cashPosition":
            let v = Decimal(string: widget.kpiValue ?? "0") ?? .zero
            return ("dashboard.kpi.cashPosition", v.formatted(.currency(code: currency)),
                    widget.kpiDelta ?? 0, "dashboard.delta.vs30Days", nil)
        case "kpi.stockValue":
            return ("dashboard.kpi.stockValue",
                    "\(widget.kpiCount ?? Int(widget.kpiValue ?? "0") ?? 0)",
                    widget.kpiDelta ?? 0, "", nil)
        case "kpi.todayMovements":
            return ("dashboard.kpi.todayMovements",
                    "\(widget.kpiCount ?? Int(widget.kpiValue ?? "0") ?? 0)",
                    widget.kpiDelta ?? 0, "", nil)
        case "kpi.weekMovements":
            return ("dashboard.kpi.weekMovements",
                    "\(widget.kpiCount ?? Int(widget.kpiValue ?? "0") ?? 0)",
                    widget.kpiDelta ?? 0, "", nil)
        default:
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
