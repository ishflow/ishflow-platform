import AppShared
import SwiftUI

/// Compact popover content shown when the centered "+" tab is tapped.
/// Sized for `.popover` presentation with `presentationCompactAdaptation(.popover)`
/// so it floats above the tab bar instead of taking over the screen as a sheet.
///
/// Actions are now driven by the server (`session.fabActions`). Each action's
/// `id` is mapped to the existing `NewDocumentSheet.Action` enum; unknown ids
/// surface the `.comingSoon` placeholder.
struct FABMenu: View {
    let actions: [FabAction]
    let onSelect: (NewDocumentSheet.Action) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(actions) { action in
                let mapped = mapAction(action.id)
                menuRow(
                    action: mapped,
                    icon: action.icon,
                    title: LocalizedStringKey(action.labelKey)
                )
                if action.id != actions.last?.id {
                    Divider().padding(.vertical, 4)
                }
            }
        }
        .padding(.vertical, 10)
        .frame(width: 260)
    }

    /// Map a server action id to the local `NewDocumentSheet.Action` enum.
    /// Unknown ids fall back to `.comingSoon`.
    private func mapAction(_ id: String) -> NewDocumentSheet.Action {
        switch id {
        case "salesInvoice":      return .salesInvoice
        case "paymentReceived":   return .paymentReceived
        case "purchaseInvoice":   return .purchaseInvoice
        case "paymentSent":       return .paymentSent
        default:                  return .comingSoon
        }
    }

    @ViewBuilder
    private func menuRow(
        action: NewDocumentSheet.Action,
        icon: String,
        title: LocalizedStringKey
    ) -> some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            dismiss()
            onSelect(action)
        } label: {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 16))
                    .foregroundStyle(.tint)
                    .frame(width: 22, alignment: .center)
                Text(title)
                    .font(.body)
                    .foregroundStyle(.primary)
                Spacer(minLength: 8)
            }
            .padding(.leading, 14)
            .padding(.trailing, 10)
            .padding(.vertical, 9)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
