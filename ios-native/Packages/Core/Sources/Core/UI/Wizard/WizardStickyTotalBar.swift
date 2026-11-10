import SwiftUI

/// Glass bar showing the running document total.
/// - When the document has no value (`dim == true`), the bar fades to neutral.
/// - When the doc has value, it gains `tint` — green for money-in (sales,
///   payment_received), orange for money-out (purchase, payment_sent).
/// Mirrors Android `WizardStickyTotalBar`.
public struct WizardStickyTotalBar: View {
    public let label: String
    public let value: String
    public let dim: Bool
    public let tint: Color

    public init(label: String, value: String, dim: Bool, tint: Color = .green) {
        self.label = label
        self.value = value
        self.dim = dim
        self.tint = tint
    }

    public var body: some View {
        HStack {
            Text(verbatim: label)
                .font(.system(size: 12))
                .foregroundStyle(.secondary)
            Spacer(minLength: 8)
            Text(value)
                .font(WizardTokens.totalValueFont)
                .foregroundStyle(dim ? .secondary : .primary)
                .monospacedDigit()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: WizardTokens.totalBarRadius, style: .continuous)
                .fill(.ultraThinMaterial)
        )
        .overlay(
            RoundedRectangle(cornerRadius: WizardTokens.totalBarRadius, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: dim
                            ? [Color.clear, Color.clear]
                            : [tint.opacity(0.18), tint.opacity(0.04)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
        )
        .overlay(
            RoundedRectangle(cornerRadius: WizardTokens.totalBarRadius, style: .continuous)
                .strokeBorder(
                    dim ? WizardTokens.solidStroke : tint.opacity(0.30),
                    lineWidth: 0.5
                )
        )
        .opacity(dim ? 0.55 : 1.0)
        .padding(.horizontal, 14)
        .padding(.bottom, 6)
    }
}

#Preview {
    VStack(spacing: 8) {
        WizardStickyTotalBar(
            label: "Итого, 0 поз.",
            value: "0,00 с",
            dim: true
        )
        WizardStickyTotalBar(
            label: "Итого, 2 поз.",
            value: "12 480,00 с",
            dim: false
        )
    }
    .padding(.vertical)
    .background(.black)
}
