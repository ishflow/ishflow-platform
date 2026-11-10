import AppShared
import SwiftUI

struct StatusChip: View {
    let status: DocumentStatus

    var body: some View {
        Text(label)
            .font(.caption2).fontWeight(.semibold)
            .padding(.horizontal, 8).padding(.vertical, 4)
            .background(color.opacity(0.15), in: Capsule())
            .foregroundStyle(color)
    }

    private var color: Color {
        switch status {
        case .draft: .gray
        case .saved: .blue
        case .posted: .green
        case .cancelled: .red
        }
    }

    private var label: LocalizedStringKey {
        switch status {
        case .draft: "status.draft"
        case .saved: "status.saved"
        case .posted: "status.posted"
        case .cancelled: "status.cancelled"
        }
    }
}
