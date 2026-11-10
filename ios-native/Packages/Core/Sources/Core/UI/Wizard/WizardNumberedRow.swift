import SwiftUI

/// Numbered "step" row used for the single required field (Контрагент) in the
/// wizard body. The leading circle shows the step number when empty; it flips
/// to a filled check-circle once the value is set.
/// Mirrors Android `WizardNumberedRow`.
public struct WizardNumberedRow: View {
    public let number: Int
    public let label: LocalizedStringKey
    public let value: String?
    public let placeholder: LocalizedStringKey
    public let action: () -> Void

    public init(
        number: Int,
        label: LocalizedStringKey,
        value: String?,
        placeholder: LocalizedStringKey,
        action: @escaping () -> Void
    ) {
        self.number = number
        self.label = label
        self.value = value
        self.placeholder = placeholder
        self.action = action
    }

    private var isFilled: Bool { value?.isEmpty == false }

    public var body: some View {
        Button(action: action) {
            HStack(spacing: 14) {
                ZStack {
                    Circle()
                        .fill(isFilled ? Color.accentColor.opacity(0.20) : Color.accentColor.opacity(0.10))
                        .frame(width: 32, height: 32)
                    Circle()
                        .strokeBorder(
                            isFilled ? Color.accentColor.opacity(0.45) : Color.accentColor.opacity(0.30),
                            lineWidth: 0.8
                        )
                        .frame(width: 32, height: 32)
                    if isFilled {
                        Image(systemName: "checkmark")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(Color.accentColor)
                    } else {
                        Text("\(number)")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Color.accentColor)
                            .monospacedDigit()
                    }
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(label)
                        .font(WizardTokens.labelFont)
                        .tracking(0.4)
                        .textCase(.uppercase)
                        .foregroundStyle(.secondary)
                    if let value, !value.isEmpty {
                        Text(verbatim: value)
                            .font(WizardTokens.valueFont)
                            .foregroundStyle(Color.primary)
                            .lineLimit(1)
                            .truncationMode(.tail)
                    } else {
                        Text(placeholder)
                            .font(WizardTokens.valueFont)
                            .foregroundStyle(Color.accentColor)
                            .lineLimit(1)
                            .truncationMode(.tail)
                    }
                }
                Spacer(minLength: 8)
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: WizardTokens.cardRadius, style: .continuous)
                    .fill(.ultraThinMaterial)
            )
            .overlay(
                RoundedRectangle(cornerRadius: WizardTokens.cardRadius, style: .continuous)
                    .strokeBorder(
                        isFilled ? Color.accentColor.opacity(0.25) : Color.accentColor.opacity(0.30),
                        lineWidth: 0.8
                    )
            )
            .contentShape(RoundedRectangle(cornerRadius: WizardTokens.cardRadius, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
    }
}

#Preview {
    VStack(spacing: 12) {
        WizardNumberedRow(
            number: 1,
            label: "Контрагент",
            value: nil,
            placeholder: "Выберите покупателя"
        ) {}
        WizardNumberedRow(
            number: 1,
            label: "Контрагент",
            value: "ОсОО Алтын-Аракет",
            placeholder: "Выберите покупателя"
        ) {}
    }
    .padding()
    .background(.black)
}
