import AppShared
import SwiftUI

struct ActivityFeedRow: View {
    let item: DashboardSummary.ActivityItem
    let action: (() -> Void)?

    init(item: DashboardSummary.ActivityItem, action: (() -> Void)? = nil) {
        self.item = item
        self.action = action
    }

    /// Glyph + tint derived from the deep-link path. `item.kind` is just the
    /// state (`saved`/`posted`/`paid`); domain (sales vs purchases, invoice vs
    /// payment) lives in `item.href`. Distinct icons let the user tell apart
    /// rows that legitimately share a display number across doc tables (e.g.
    /// sales `INVOICE-000001` and purchases `INVOICE-000001`).
    private var iconStyle: (name: String, tint: Color) {
        let h = item.href
        if h.contains("/sales.invoice/") { return ("doc.text.fill", .orange) }
        if h.contains("/purchases.invoice/") { return ("cart.fill", .indigo) }
        if h.contains("/sales.payment_received/") { return ("arrow.down.circle.fill", .green) }
        if h.contains("/purchases.payment_sent/") { return ("arrow.up.circle.fill", .red) }
        return ("circle.fill", .secondary)
    }

    private func timeLabel(for date: Date, now: Date = Date()) -> LocalizedStringResource {
        let secs = Int(now.timeIntervalSince(date))
        if secs < 60 {
            return LocalizedStringResource("dashboard.activity.justNow")
        }
        let mins = secs / 60
        if mins < 60 {
            return LocalizedStringResource(
                "dashboard.activity.minutesAgo",
                defaultValue: "\(mins) min ago"
            )
        }
        let hrs = mins / 60
        if hrs < 24 {
            return LocalizedStringResource(
                "dashboard.activity.hoursAgo",
                defaultValue: "\(hrs) h ago"
            )
        }
        let cal = Calendar.current
        let days = cal.dateComponents([.day], from: cal.startOfDay(for: date), to: cal.startOfDay(for: now)).day ?? 0
        if days == 1 {
            return LocalizedStringResource("dashboard.activity.yesterday")
        }
        if days < 7 {
            return LocalizedStringResource(
                "dashboard.activity.daysAgo",
                defaultValue: "\(days) days ago"
            )
        }
        let formatted = date.formatted(.dateTime.day().month(.abbreviated))
        return LocalizedStringResource(stringLiteral: formatted)
    }

    private var rowContent: some View {
        let style = iconStyle
        return HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(style.tint.opacity(0.15))
                    .frame(width: 32, height: 32)
                Image(systemName: style.name)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(style.tint)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(item.label)
                    .font(.body)
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                if let date = item.eventDate {
                    Text(timeLabel(for: date))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer(minLength: 8)
            if action != nil {
                Image(systemName: "chevron.right")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(.vertical, 8)
        .frame(minHeight: 48)
        .contentShape(Rectangle())
    }

    var body: some View {
        if let action {
            Button {
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                action()
            } label: {
                rowContent
            }
            .buttonStyle(.plain)
        } else {
            rowContent
        }
    }
}
