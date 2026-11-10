import SwiftUI

public enum AppTheme: String, CaseIterable, Identifiable {
    case system, light, dark
    public var id: String { rawValue }

    public var colorScheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .light:  return .light
        case .dark:   return .dark
        }
    }

    /// Static literal keys — `LocalizedStringKey("settings.theme.\(rawValue)")` uses the
    /// string-*interpolation* initializer (key becomes "settings.theme.%@"), which never
    /// matches the catalog entry and renders the raw key. Literals localize correctly.
    public var labelKey: LocalizedStringKey {
        switch self {
        case .system: return "settings.theme.system"
        case .light:  return "settings.theme.light"
        case .dark:   return "settings.theme.dark"
        }
    }
}

public struct ThemePickerView: View {
    @AppStorage("appTheme") private var themeRaw: String = AppTheme.system.rawValue

    public init() {}

    public var body: some View {
        List {
            ForEach(AppTheme.allCases) { t in
                Button {
                    themeRaw = t.rawValue
                } label: {
                    HStack {
                        Text(t.labelKey)
                            .foregroundStyle(.primary)
                        Spacer()
                        if themeRaw == t.rawValue {
                            Image(systemName: "checkmark").foregroundStyle(.tint)
                        }
                    }
                }
                .buttonStyle(.plain)
            }
        }
        .navigationTitle("settings.theme.title")
    }
}
