import SwiftUI

public struct LanguagePickerView: View {
    @AppStorage("appLocale") private var localeCode: String = "ru"

    private static let supported = ["ru", "en", "tr", "uz", "ky"]

    public init() {}

    /// Map a locale code to its label key. A literal `LocalizedStringKey` per
    /// case is required: `LocalizedStringKey("settings.language.\(code)")`
    /// treats the interpolation as a format argument (key becomes
    /// `settings.language.%@`), so the lookup misses and the raw key renders.
    private func languageLabel(_ code: String) -> LocalizedStringKey {
        switch code {
        case "ru": return "settings.language.ru"
        case "en": return "settings.language.en"
        case "tr": return "settings.language.tr"
        case "uz": return "settings.language.uz"
        case "ky": return "settings.language.ky"
        default: return LocalizedStringKey(code)
        }
    }

    public var body: some View {
        List {
            ForEach(Self.supported, id: \.self) { code in
                Button {
                    localeCode = code
                } label: {
                    HStack {
                        Text(languageLabel(code))
                            .foregroundStyle(.primary)
                        Spacer()
                        if localeCode == code {
                            Image(systemName: "checkmark")
                                .foregroundStyle(.tint)
                        }
                    }
                }
                .buttonStyle(.plain)
                .accessibilityLabel(Text(languageLabel(code)))
                .accessibilityAddTraits(localeCode == code ? .isSelected : [])
            }
        }
        .navigationTitle("settings.language.title")
    }
}
