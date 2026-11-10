import SwiftUI

/// Capsule chip with three states:
///   - empty  → dashed border, secondary text, neutral icon
///   - value  → solid accent border, primary text, accent icon
///   - error  → red border + red icon/text (e.g. missing-warehouse)
///
/// Used for date / price-type / warehouse meta in the sales wizard.
/// Mirrors Android `WizardDashedChip`.
public struct WizardDashedChip: View {
    public let systemImage: String
    public let text: LocalizedStringKey
    public let hasValue: Bool
    public let isError: Bool
    public let action: () -> Void

    public init(
        systemImage: String,
        text: LocalizedStringKey,
        hasValue: Bool,
        isError: Bool = false,
        action: @escaping () -> Void
    ) {
        self.systemImage = systemImage
        self.text = text
        self.hasValue = hasValue
        self.isError = isError
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: systemImage)
                    .font(.system(size: 13))
                Text(text)
                    .font(.system(size: 13))
                    .lineLimit(1)
                    .truncationMode(.tail)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .frame(minHeight: WizardTokens.chipHeight)
            .foregroundStyle(foreground)
            .background(
                Capsule(style: .continuous)
                    .fill(.ultraThinMaterial)
            )
            .overlay(
                Capsule(style: .continuous)
                    .strokeBorder(
                        borderColor,
                        style: StrokeStyle(
                            lineWidth: hasValue || isError ? 0.8 : 1.0,
                            dash: hasValue || isError ? [] : [3, 3]
                        )
                    )
            )
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
    }

    private var foreground: Color {
        if isError { return .red }
        return hasValue ? .primary : .secondary
    }

    private var borderColor: Color {
        if isError { return Color.red.opacity(0.55) }
        return hasValue ? Color.accentColor.opacity(0.55) : WizardTokens.dashedStroke
    }
}

#Preview {
    VStack(spacing: 12) {
        HStack(spacing: 6) {
            WizardDashedChip(
                systemImage: "calendar",
                text: "16 мая",
                hasValue: true
            ) {}
            WizardDashedChip(
                systemImage: "tag",
                text: "Тип цены",
                hasValue: false
            ) {}
            WizardDashedChip(
                systemImage: "building.2",
                text: "Склад",
                hasValue: false,
                isError: true
            ) {}
        }
    }
    .padding()
    .background(.black)
}
