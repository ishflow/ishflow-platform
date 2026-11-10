import SwiftUI

/// Inline product search pill with a trailing "Новый" / barcode-scan action.
/// Mirrors Android `InlineProductSearch`. This is the visual container only —
/// suggestion dropdown is owned by the parent screen (typically presented as
/// a half-sheet picker).
public struct WizardSearchField: View {
    public let placeholder: LocalizedStringKey
    public let onTap: () -> Void
    public let onTrailingAction: () -> Void
    public let trailingIcon: String
    public let trailingLabel: LocalizedStringKey

    public init(
        placeholder: LocalizedStringKey,
        trailingIcon: String = "plus",
        trailingLabel: LocalizedStringKey = "wizard.search.new",
        onTap: @escaping () -> Void,
        onTrailingAction: @escaping () -> Void
    ) {
        self.placeholder = placeholder
        self.trailingIcon = trailingIcon
        self.trailingLabel = trailingLabel
        self.onTap = onTap
        self.onTrailingAction = onTrailingAction
    }

    public var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 18))
                .foregroundStyle(.secondary)
            Button(action: onTap) {
                HStack {
                    Text(placeholder)
                        .font(.system(size: 15))
                        .foregroundStyle(.secondary)
                    Spacer()
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            Button(action: onTrailingAction) {
                HStack(spacing: 6) {
                    Image(systemName: trailingIcon)
                        .font(.system(size: 16, weight: .semibold))
                    Text(trailingLabel)
                        .font(.system(size: 13, weight: .semibold))
                }
                .padding(.horizontal, 14)
                .frame(height: 36)
                .foregroundStyle(Color.accentColor)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Color.accentColor.opacity(0.18))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .strokeBorder(Color.accentColor.opacity(0.35), lineWidth: 0.5)
                )
            }
            .buttonStyle(.plain)
        }
        .padding(.leading, 14)
        .padding(.trailing, 6)
        .frame(height: WizardTokens.searchHeight)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(.ultraThinMaterial)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .strokeBorder(WizardTokens.solidStroke, lineWidth: 0.5)
        )
    }
}

#Preview {
    WizardSearchField(
        placeholder: "Найти товар или сканировать…",
        onTap: {},
        onTrailingAction: {}
    )
    .padding()
    .background(.black)
}
