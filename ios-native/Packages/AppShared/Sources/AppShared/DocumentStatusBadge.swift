import SwiftUI

/// Compact pill that shows whether a document is `Taslak` (saved/draft) or
/// `Onaylandı` (posted), or `İptal` (cancelled). Same color language as the
/// detail screen's status pill but sized for list rows.
///
/// Use in any list/feed where users need to tell a written-but-unposted
/// document from a posted one at a glance. Detail screens render their
/// own larger pill in `DocumentDetailContent`.
public struct DocumentStatusBadge: View {
    public let status: DocumentStatus

    public init(status: DocumentStatus) {
        self.status = status
    }

    public var body: some View {
        let (label, color) = palette
        Text(label)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(Capsule().fill(color.opacity(0.18)))
            .foregroundStyle(color)
            .accessibilityLabel(label)
    }

    private var palette: (LocalizedStringKey, Color) {
        switch status {
        case .posted: return ("status.posted", .green)
        case .saved: return ("status.saved", .blue)
        case .draft: return ("status.draft", .gray)
        case .cancelled: return ("status.cancelled", .red)
        }
    }
}
