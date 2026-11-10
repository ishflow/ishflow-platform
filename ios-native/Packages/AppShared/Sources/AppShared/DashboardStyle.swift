import SwiftUI

/// Selectable dashboard look. Persisted in `@AppStorage("dashboardStyle")`
/// — the picker lives in Settings, the variant views read the same key.
/// Public because both the app target (variants live in ishflow) and the
/// Settings package (which hosts the picker UI) need it.
public enum DashboardStyle: String, CaseIterable, Identifiable, Sendable {
    case v1Hero
    case v2Bento
    case v3Charts

    public var id: String { rawValue }

    /// Localized label key shown in the picker.
    public var labelKey: LocalizedStringKey {
        switch self {
        case .v1Hero:   return "dashboardStyle.v1Hero"
        case .v2Bento:  return "dashboardStyle.v2Bento"
        case .v3Charts: return "dashboardStyle.v3Charts"
        }
    }

    /// One-line description used as the picker's footer / sub-label.
    public var summaryKey: LocalizedStringKey {
        switch self {
        case .v1Hero:   return "dashboardStyle.v1Hero.summary"
        case .v2Bento:  return "dashboardStyle.v2Bento.summary"
        case .v3Charts: return "dashboardStyle.v3Charts.summary"
        }
    }
}

/// Storage key for the dashboard style. Centralised so MainTabView,
/// MoreSheet, and the Settings picker reference the same string.
public enum DashboardStyleStorage {
    public static let key = "dashboardStyle"
    /// Default selection when the user hasn't picked anything yet.
    /// V3 ("Analitik") is the most polished layout, so it ships as default.
    public static let defaultStyle: DashboardStyle = .v3Charts
}
