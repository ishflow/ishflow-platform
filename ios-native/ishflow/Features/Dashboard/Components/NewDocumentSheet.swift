import SwiftUI

/// Bottom-sheet "create new document" picker shown when the dashboard FAB is
/// tapped. Modeled on Apple's Reminders / Calendar "+" sheets: two grouped
/// sections (Sales / Purchases), each row showing a 36pt colored icon tile,
/// title, and a one-line description.
///
/// Communication: parent supplies `onSelect`; the sheet calls it with the
/// chosen `Action` and dismisses itself. Parent then routes to the correct
/// "new document" wizard or to a coming-soon alert.
struct NewDocumentSheet: View {
    enum Action {
        case salesInvoice
        case paymentReceived
        case purchaseInvoice
        case paymentSent
        case comingSoon
    }

    let onSelect: (Action) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section("dashboard.fab.section.sales") {
                    row(
                        action: .salesInvoice,
                        icon: "doc.text.fill",
                        tint: .orange,
                        title: "dashboard.fab.salesInvoice",
                        subtitle: "dashboard.fab.salesInvoice.subtitle"
                    )
                    row(
                        action: .paymentReceived,
                        icon: "arrow.down.circle.fill",
                        tint: .green,
                        title: "dashboard.fab.paymentReceived",
                        subtitle: "dashboard.fab.paymentReceived.subtitle"
                    )
                }

                Section("dashboard.fab.section.purchases") {
                    row(
                        action: .purchaseInvoice,
                        icon: "cart.fill",
                        tint: .indigo,
                        title: "dashboard.fab.purchaseInvoice",
                        subtitle: "dashboard.fab.purchaseInvoice.subtitle"
                    )
                    row(
                        action: .paymentSent,
                        icon: "arrow.up.circle.fill",
                        tint: .red,
                        title: "dashboard.fab.paymentSent",
                        subtitle: "dashboard.fab.paymentSent.subtitle"
                    )
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle(Text("dashboard.fab.new"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("common.cancel") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(28)
    }

    @ViewBuilder
    private func row(
        action: Action,
        icon: String,
        tint: Color,
        title: LocalizedStringKey,
        subtitle: LocalizedStringKey
    ) -> some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            dismiss()
            onSelect(action)
        } label: {
            HStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 9, style: .continuous)
                        .fill(tint)
                        .frame(width: 36, height: 36)
                    Image(systemName: icon)
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(.white)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.body)
                        .foregroundStyle(.primary)
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                Spacer(minLength: 8)
            }
            .padding(.vertical, 4)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    Color.gray.opacity(0.2)
        .ignoresSafeArea()
        .sheet(isPresented: .constant(true)) {
            NewDocumentSheet(onSelect: { _ in })
        }
}
