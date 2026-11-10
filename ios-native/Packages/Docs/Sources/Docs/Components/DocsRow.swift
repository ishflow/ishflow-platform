import AppShared
import SwiftUI

/// One row in the unified Docs list — type-discriminated icon tile, document
/// number, relative date, counterparty name, and currency-formatted amount.
///
/// Icon + tint are derived from `summary.kind`:
/// - `.salesInvoice` → `doc.text.fill` on orange
/// - `.salesPaymentReceived` → `arrow.down.circle.fill` on green
/// - `.purchaseInvoice` → `cart.fill` on indigo
/// - `.purchasePaymentSent` → `arrow.up.circle.fill` on red
struct DocsRow: View {
    let summary: DocumentSummary

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            iconTile
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(summary.displayNumber)
                        .font(.subheadline.weight(.semibold))
                        .lineLimit(1)
                    DocumentStatusBadge(status: summary.status)
                    Spacer()
                    Text(summary.date, style: .relative)
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                        .lineLimit(1)
                }
                HStack {
                    Text(summary.counterpartyName ?? "—")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                    if let amount = summary.amount, let currency = summary.currency {
                        Text(amount.value, format: .currency(code: currency))
                            .font(.caption.weight(.semibold))
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }

    private var iconTile: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8).fill(tint)
            Image(systemName: symbol)
                .foregroundStyle(.white)
                .font(.subheadline.weight(.bold))
        }
        .frame(width: 36, height: 36)
    }

    private var symbol: String {
        switch summary.kind {
        case .salesInvoice: "doc.text.fill"
        case .salesPaymentReceived: "arrow.down.circle.fill"
        case .purchaseInvoice: "cart.fill"
        case .purchasePaymentSent: "arrow.up.circle.fill"
        }
    }

    private var tint: Color {
        switch summary.kind {
        case .salesInvoice: .orange
        case .salesPaymentReceived: .green
        case .purchaseInvoice: .indigo
        case .purchasePaymentSent: .red
        }
    }
}
