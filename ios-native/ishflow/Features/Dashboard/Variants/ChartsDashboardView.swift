import APIClient
import AppShared
import Charts
import SwiftUI

/// **V3 — Charts-forward.** Reference: Image #14 right. Big featured KPI
/// number up top, a full-width line/area chart fed by the backend's
/// `chartPoints`, then a 3-up colored grid of supporting KPIs and a
/// compact activity list below.
struct ChartsDashboardView: View {
    @Environment(AppSession.self) private var session
    @Environment(\.scenePhase) private var scenePhase
    @State private var viewModel: DashboardViewModel?
    private let api: any APIClient
    private let isPreview: Bool

    var onNewSale: () -> Void
    var onTapKPI: (DashboardView.DashboardKPI) -> Void
    var onTapActivity: (DashboardSummary.ActivityItem) -> Void
    var onSeeAll: (DashboardView.DashboardSection) -> Void
    var onOpenNotifications: () -> Void
    var onOpenLowStock: () -> Void
    var notificationCount: Int

    init(
        api: any APIClient,
        onNewSale: @escaping () -> Void = {},
        onTapKPI: @escaping (DashboardView.DashboardKPI) -> Void = { _ in },
        onTapActivity: @escaping (DashboardSummary.ActivityItem) -> Void = { _ in },
        onSeeAll: @escaping (DashboardView.DashboardSection) -> Void = { _ in },
        onOpenNotifications: @escaping () -> Void = {},
        onOpenLowStock: @escaping () -> Void = {},
        notificationCount: Int = 0
    ) {
        self.api = api
        self.isPreview = false
        self.onNewSale = onNewSale
        self.onTapKPI = onTapKPI
        self.onTapActivity = onTapActivity
        self.onSeeAll = onSeeAll
        self.onOpenNotifications = onOpenNotifications
        self.onOpenLowStock = onOpenLowStock
        self.notificationCount = notificationCount
    }

    var body: some View {
        NavigationStack {
            content
                .navigationTitle(Text("dashboard.title"))
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
                    ToolbarItem(placement: .topBarTrailing) {
                        NotificationBellButton(count: notificationCount, action: onOpenNotifications)
                    }
                    .sharedBackgroundVisibility(.hidden)
                }
                .rootToolbar()
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
        let actions = layout.layout.first(where: { $0.slot == .actions })?.widgets ?? []
        let activity = layout.layout.first(where: { $0.slot == .activity })?.widgets ?? []
        let trendWidget = layout.layout
            .first(where: { $0.slot == .trends })?
            .widgets.first
        let trendPoints = trendWidget?.chartPoints ?? []

        let big = primaryWidget(in: heroes)
        let triplets = supportingWidgets(in: heroes, excluding: big).prefix(3)

        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                bigHeadlineNumber(widget: big, currency: currency)
                    .padding(.horizontal, 20)

                actionsSection(actions)

                // Render the trend card only when the backend actually
                // shipped a chart widget for this role *and* it has data.
                // Roles without a trend widget (or with an empty payload
                // — warehouse stockTrend today) skip the card entirely so
                // the dashboard doesn't end with a misleading empty box.
                if trendWidget != nil, !trendPoints.isEmpty {
                    chartCard(points: trendPoints)
                        .padding(.horizontal, 20)
                }

                supportingTriple(Array(triplets), currency: currency)
                    .padding(.horizontal, 20)

                transactionsSection(activity)
                    .padding(.top, 4)
            }
            .padding(.vertical, 12)
        }
        .scrollIndicators(.hidden)
        .background(Color(.systemGroupedBackground))
    }

    // MARK: - Headline

    @ViewBuilder
    private func bigHeadlineNumber(widget: DashboardLayout.Widget?, currency: String) -> some View {
        let (titleKey, value, deltaPct, deltaKey, kpi) =
            widget.map { meta(for: $0, currency: currency) } ??
            (LocalizedStringKey("dashboard.kpi.thisMonthSales"), "—", 0, LocalizedStringKey(""), nil)
        // Numeric-count KPIs (open invoices, low-stock count) shouldn't get
        // a currency suffix — they're just integers.
        let isCount = widget.map(isCountKPI(_:)) ?? false

        Button {
            if let kpi { onTapKPI(kpi) }
        } label: {
            VStack(alignment: .leading, spacing: 6) {
                Text(titleKey)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(value)
                        .font(.system(size: 36, weight: .bold, design: .rounded).monospacedDigit())
                        .foregroundStyle(.primary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                    if !isCount {
                        Text(currency)
                            .font(.headline.weight(.semibold))
                            .foregroundStyle(.secondary)
                    }
                }
                if deltaPct != 0 {
                    deltaPill(delta: deltaPct, key: deltaKey)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .buttonStyle(.plain)
    }

    private func isCountKPI(_ widget: DashboardLayout.Widget) -> Bool {
        switch widget.id {
        case "kpi.openInvoices", "kpi.stockValue",
             "kpi.todayMovements", "kpi.weekMovements":
            return true
        default:
            return false
        }
    }

    /// Renders any actionable banners the backend ships in the `actions` slot
    /// (e.g. low-stock alert). Each row links the user toward the matching
    /// remediation flow. Hidden entirely when there's nothing actionable so
    /// the dashboard stays clean for owner/admin who only see KPIs.
    @ViewBuilder
    private func actionsSection(_ widgets: [DashboardLayout.Widget]) -> some View {
        let rows = actionRows(from: widgets)
        if !rows.isEmpty {
            VStack(spacing: 8) {
                ForEach(rows, id: \.id) { row in
                    actionBanner(row)
                        .padding(.horizontal, 20)
                }
            }
        }
    }

    private struct ActionRow: Identifiable {
        let id: String
        let icon: String
        let tint: Color
        let titleKey: LocalizedStringKey
        let count: Int
        let action: () -> Void
    }

    private func actionRows(from widgets: [DashboardLayout.Widget]) -> [ActionRow] {
        var rows: [ActionRow] = []
        if let w = widgets.first(where: { $0.id == "action.lowStock" }),
           let count = w.kpiCount, count > 0 {
            rows.append(ActionRow(
                id: w.id,
                icon: "exclamationmark.triangle.fill",
                tint: .orange,
                titleKey: "dashboard.queue.lowStock",
                count: count,
                action: onOpenLowStock
            ))
        }
        if let w = widgets.first(where: { $0.id == "action.upcomingReceivables" }) {
            let overdueCount = w.listItems.filter(isOverdue).count
            if overdueCount > 0 {
                rows.append(ActionRow(
                    id: w.id,
                    icon: "clock.badge.exclamationmark",
                    tint: .red,
                    titleKey: "dashboard.queue.overdueReceivables",
                    count: overdueCount,
                    action: { onSeeAll(.upcomingReceivables) }
                ))
            }
        }
        if let w = widgets.first(where: { $0.id == "action.upcomingPayables" }),
           !w.listItems.isEmpty {
            rows.append(ActionRow(
                id: w.id,
                icon: "creditcard",
                tint: .indigo,
                titleKey: "dashboard.queue.upcomingPayables",
                count: w.listItems.count,
                action: {}
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
    private func actionBanner(_ row: ActionRow) -> some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            row.action()
        } label: {
            HStack(spacing: 12) {
                Image(systemName: row.icon)
                    .font(.body.weight(.semibold))
                    .foregroundStyle(row.tint)
                    .frame(width: 36, height: 36)
                    .background(Circle().fill(row.tint.opacity(0.15)))
                Text("\(row.count) ") + Text(row.titleKey)
                    .foregroundStyle(.primary)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.tertiary)
            }
            .padding(14)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(Color(.secondarySystemGroupedBackground))
            )
            .contentShape(RoundedRectangle(cornerRadius: 16))
        }
        .buttonStyle(.plain)
    }

    private func deltaPill(delta: Double, key: LocalizedStringKey) -> some View {
        let isUp = delta > 0
        return HStack(spacing: 4) {
            Image(systemName: isUp ? "arrow.up.right" : "arrow.down.right")
            Text("\(Int(delta.rounded()))% ") + Text(key).foregroundStyle(.secondary)
        }
        .font(.caption.weight(.semibold))
        .foregroundStyle(isUp ? Color.green : Color.red)
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(Capsule().fill((isUp ? Color.green : Color.red).opacity(0.12)))
    }

    // MARK: - Chart card

    @ViewBuilder
    private func chartCard(points: [DashboardLayout.Widget.ChartPoint]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text("dashboard.chart.title")
                    .font(.headline)
                Spacer()
                if !points.isEmpty {
                    Text("\(points.count)")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(Capsule().fill(Color(.tertiarySystemFill)))
                }
            }
            if points.isEmpty {
                ZStack {
                    fakeAreaPlaceholder
                    Text("dashboard.chart.empty")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                .frame(height: 140)
            } else {
                Chart {
                    ForEach(Array(points.enumerated()), id: \.offset) { _, p in
                        LineMark(
                            x: .value("date", p.date),
                            y: .value("value", p.value)
                        )
                        .interpolationMethod(.monotone)
                        .foregroundStyle(.tint)
                        AreaMark(
                            x: .value("date", p.date),
                            y: .value("value", p.value)
                        )
                        .interpolationMethod(.monotone)
                        .foregroundStyle(
                            LinearGradient(
                                colors: [Color.accentColor.opacity(0.35), Color.accentColor.opacity(0)],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                    }
                }
                .chartXAxis {
                    AxisMarks(values: .automatic(desiredCount: 4)) { _ in
                        AxisValueLabel().font(.caption2)
                    }
                }
                .chartYAxis {
                    AxisMarks(position: .leading, values: .automatic(desiredCount: 3)) { _ in
                        AxisValueLabel().font(.caption2)
                        AxisGridLine()
                    }
                }
                .frame(height: 160)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .fill(Color(.secondarySystemGroupedBackground))
        )
    }

    private var fakeAreaPlaceholder: some View {
        let pts: [Double] = [0.4, 0.55, 0.5, 0.7, 0.62, 0.85, 0.78, 0.95, 0.88]
        return GeometryReader { geo in
            let stepX = geo.size.width / CGFloat(pts.count - 1)
            ZStack {
                Path { p in
                    p.move(to: CGPoint(x: 0, y: geo.size.height))
                    for (i, value) in pts.enumerated() {
                        let x = stepX * CGFloat(i)
                        let y = geo.size.height * (1 - CGFloat(value)) + 6
                        if i == 0 { p.move(to: CGPoint(x: x, y: y)) } else {
                            p.addLine(to: CGPoint(x: x, y: y))
                        }
                    }
                }
                .stroke(Color.accentColor.opacity(0.3), style: StrokeStyle(lineWidth: 2, lineCap: .round))
            }
        }
    }

    // MARK: - Supporting triple

    @ViewBuilder
    private func supportingTriple(
        _ widgets: [DashboardLayout.Widget],
        currency: String
    ) -> some View {
        if widgets.isEmpty { EmptyView() } else {
            HStack(spacing: 10) {
                ForEach(Array(widgets.enumerated()), id: \.element.id) { index, widget in
                    let color = supportingColor(for: index)
                    triplet(widget: widget, color: color, currency: currency)
                        .frame(maxWidth: .infinity)
                }
            }
        }
    }

    private func supportingColor(for index: Int) -> Color {
        switch index {
        case 0: return .mint
        case 1: return .purple
        default: return .orange
        }
    }

    private func triplet(
        widget: DashboardLayout.Widget,
        color: Color,
        currency: String
    ) -> some View {
        let (labelKey, value, _, _, kpi) = meta(for: widget, currency: currency)
        return Button {
            if let kpi { onTapKPI(kpi) }
        } label: {
            VStack(alignment: .leading, spacing: 8) {
                Image(systemName: glyph(for: widget.id))
                    .font(.caption.weight(.bold))
                    .foregroundStyle(color)
                    .padding(6)
                    .background(Circle().fill(.white.opacity(0.6)))
                Text(value)
                    .font(.headline.weight(.bold).monospacedDigit())
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                Text(labelKey)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
            .padding(12)
            .frame(maxWidth: .infinity, minHeight: 100, alignment: .topLeading)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(color.opacity(0.18))
            )
        }
        .buttonStyle(.plain)
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

    // MARK: - Transactions

    @ViewBuilder
    private func transactionsSection(_ widgets: [DashboardLayout.Widget]) -> some View {
        let recent = widgets.first(where: { $0.id == "list.recentActivity" })
        let items = recent?.listItems ?? []
        if items.isEmpty { EmptyView() } else {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .firstTextBaseline) {
                    Text("dashboard.transactions")
                        .font(.headline)
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
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 8) {
                    RoundedRectangle(cornerRadius: 6).fill(.gray.opacity(0.15)).frame(height: 12).frame(width: 140)
                    RoundedRectangle(cornerRadius: 8).fill(.gray.opacity(0.15)).frame(height: 36)
                }
                .padding(.horizontal, 20)
                RoundedRectangle(cornerRadius: 22)
                    .fill(.gray.opacity(0.15))
                    .frame(height: 200)
                    .padding(.horizontal, 20)
                HStack(spacing: 10) {
                    ForEach(0 ..< 3, id: \.self) { _ in
                        RoundedRectangle(cornerRadius: 16).fill(.gray.opacity(0.15)).frame(height: 100)
                    }
                }
                .padding(.horizontal, 20)
                RoundedRectangle(cornerRadius: 18)
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

    private func primaryWidget(in heroes: [DashboardLayout.Widget]) -> DashboardLayout.Widget? {
        if let s = heroes.first(where: { $0.id == "kpi.thisMonthSales" }) { return s }
        if let c = heroes.first(where: { $0.id == "kpi.cashPosition" }) { return c }
        return heroes.first
    }

    private func supportingWidgets(
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

