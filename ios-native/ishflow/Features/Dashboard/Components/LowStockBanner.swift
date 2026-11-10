import AppShared
import SwiftUI

struct LowStockBanner: View {
    let count: Int
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: "exclamationmark.triangle.fill")
                Text(LocalizedStringResource("dashboard.lowStock.banner", defaultValue: "\(count) products low on stock"))
                    .font(.subheadline)
                Spacer()
                Image(systemName: "chevron.right").font(.caption)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(.orange.opacity(0.15), in: RoundedRectangle(cornerRadius: 12))
            .foregroundStyle(.orange)
        }
        .buttonStyle(.plain)
    }
}
