import AppShared
import SwiftUI

struct UpcomingReceivableRow: View {
    let item: DashboardSummary.UpcomingReceivable
    let currency: String
    let action: (() -> Void)?

    init(
        item: DashboardSummary.UpcomingReceivable,
        currency: String,
        action: (() -> Void)? = nil
    ) {
        self.item = item
        self.currency = currency
        self.action = action
    }

    private var dayOffset: Int? {
        guard let due = item.dueDate else { return nil }
        let cal = Calendar.current
        return cal.dateComponents([.day], from: cal.startOfDay(for: Date()), to: cal.startOfDay(for: due)).day
    }

    private var dueLabel: LocalizedStringResource {
        guard let days = dayOffset else { return LocalizedStringResource("dashboard.due.today") }
        if days < 0 { return LocalizedStringResource("dashboard.due.overdue", defaultValue: "\(-days) days overdue") }
        if days == 0 { return LocalizedStringResource("dashboard.due.today") }
        if days == 1 { return LocalizedStringResource("dashboard.due.tomorrow") }
        return LocalizedStringResource("dashboard.due.inDays", defaultValue: "in \(days) days")
    }

    private var dueColor: Color {
        guard let days = dayOffset else { return .secondary }
        return days < 0 ? .red : .secondary
    }

    private var rowContent: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(item.name).font(.subheadline.weight(.medium))
                Text(dueLabel).font(.caption).foregroundStyle(dueColor)
            }
            Spacer(minLength: 8)
            Text(item.amount.value.formatted(.currency(code: currency)))
                .font(.subheadline.weight(.semibold))
                .monospacedDigit()
            if action != nil {
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(.vertical, 4)
        .frame(minHeight: 44)
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
