import SwiftUI

/// One product-line row in the wizard body. Glass card showing
/// "qty × price = total" with trailing edit + delete icon buttons.
/// Mirrors Android `LineItemRow` / `WizardLineCard`.
public struct WizardLineCard: View {
    public let productName: String
    public let calc: String
    public let total: String
    public let onEdit: () -> Void
    public let onDelete: () -> Void

    public init(
        productName: String,
        calc: String,
        total: String,
        onEdit: @escaping () -> Void,
        onDelete: @escaping () -> Void
    ) {
        self.productName = productName
        self.calc = calc
        self.total = total
        self.onEdit = onEdit
        self.onDelete = onDelete
    }

    public var body: some View {
        HStack(alignment: .top, spacing: 8) {
            VStack(alignment: .leading, spacing: 4) {
                Text(productName)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                    .truncationMode(.tail)
                HStack(spacing: 6) {
                    Text(calc)
                        .font(.system(size: 12.5))
                        .foregroundStyle(.secondary)
                        .monospacedDigit()
                    Text(total)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.primary)
                        .monospacedDigit()
                }
            }
            Spacer(minLength: 8)
            HStack(spacing: 6) {
                Button(action: onEdit) {
                    Image(systemName: "square.and.pencil")
                        .font(.system(size: 17, weight: .semibold))
                        .frame(width: 38, height: 38)
                        .foregroundStyle(Color.accentColor)
                        .background(
                            Circle().fill(Color.accentColor.opacity(0.14))
                        )
                        .overlay(
                            Circle().strokeBorder(Color.accentColor.opacity(0.25), lineWidth: 0.5)
                        )
                }
                .buttonStyle(.plain)
                .accessibilityLabel("wizard.line.edit")

                Button(action: onDelete) {
                    Image(systemName: "trash")
                        .font(.system(size: 16, weight: .semibold))
                        .frame(width: 38, height: 38)
                        .foregroundStyle(Color.red)
                        .background(
                            Circle().fill(Color.red.opacity(0.12))
                        )
                        .overlay(
                            Circle().strokeBorder(Color.red.opacity(0.25), lineWidth: 0.5)
                        )
                }
                .buttonStyle(.plain)
                .accessibilityLabel("common.delete")
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: WizardTokens.cardRadius, style: .continuous)
                .fill(.ultraThinMaterial)
        )
        .overlay(
            RoundedRectangle(cornerRadius: WizardTokens.cardRadius, style: .continuous)
                .strokeBorder(WizardTokens.solidStroke, lineWidth: 0.5)
        )
    }
}

#Preview {
    VStack(spacing: 8) {
        WizardLineCard(
            productName: "Coffee Latte 250ml",
            calc: "20 × 350,00 =",
            total: "7 000,00 с",
            onEdit: {},
            onDelete: {}
        )
        WizardLineCard(
            productName: "Coffee Beans 1kg",
            calc: "4 × 1 370,00 =",
            total: "5 480,00 с",
            onEdit: {},
            onDelete: {}
        )
    }
    .padding()
    .background(.black)
}
