import AppShared
import SwiftUI

/// Pure render-only stock pill rendered beneath the qty row of each sales
/// wizard line. The wizard owns the async fetch and feeds resolved state in
/// via `lookup` — this view does no networking, no `@State`, no `.task`. That
/// keeps it immune to SwiftUI lifecycle quirks inside Form/ForEach/Section.
struct LineStockCheckView: View {
    let lookup: StockLookup
    let currentQty: Decimal

    /// Tri-state result handed in by the wizard.
    /// - `.unknown`: warehouse not picked yet OR fetch in flight.
    /// - `.onHand(n)`: warehouse has `n` units of this product on hand.
    /// - `.noStock`: fetch succeeded but warehouse has no row for this product.
    /// - `.failed(detail)`: fetch failed; surface the raw error inline.
    enum StockLookup: Equatable {
        case unknown
        case onHand(Decimal)
        case noStock
        case failed(String)
    }

    var body: some View {
        switch lookup {
        case .unknown:
            HStack(spacing: 6) {
                ProgressView().controlSize(.mini)
                Text("Stok kontrol ediliyor…")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        case .onHand(let onHand):
            if currentQty > onHand && currentQty > 0 {
                label(
                    icon: "exclamationmark.triangle.fill",
                    tint: .orange,
                    text: "Bu depoda sadece \(onHand as NSDecimalNumber) adet var",
                    bold: true
                )
            } else {
                label(
                    icon: "checkmark.circle.fill",
                    tint: .green,
                    text: "Stok: \(onHand as NSDecimalNumber)"
                )
            }
        case .noStock:
            label(
                icon: "exclamationmark.circle.fill",
                tint: .orange,
                text: "Bu depoda bu üründen stok yok",
                bold: true
            )
        case .failed(let detail):
            VStack(alignment: .leading, spacing: 2) {
                label(
                    icon: "xmark.octagon.fill",
                    tint: .red,
                    text: "Stok kontrolü hata verdi",
                    bold: true
                )
                Text(detail)
                    .font(.caption2)
                    .foregroundStyle(.red)
                    .textSelection(.enabled)
            }
        }
    }

    @ViewBuilder
    private func label(
        icon: String,
        tint: Color,
        text: String,
        bold: Bool = false
    ) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Image(systemName: icon).foregroundStyle(tint)
            Text(text)
                .font(bold ? .caption.weight(.semibold) : .caption2)
                .foregroundStyle(bold ? tint : .secondary)
        }
    }
}
