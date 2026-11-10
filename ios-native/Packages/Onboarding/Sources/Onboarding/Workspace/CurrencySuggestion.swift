import Foundation

/// Static helpers that map a user's device locale onto sensible defaults for
/// the workspace setup form. Task 2.8 / 3.x can replace `allCodes` with a
/// server-driven list once `/api/mobile/currencies` lands.
public enum CurrencySuggestion {
    /// The 8 user-facing locales the app ships with on day one.
    public static let supportedLocales: [String] = ["ru", "en", "tr", "uz", "ky", "de", "fr", "zh"]

    /// ISO 4217 codes the picker offers. RUB and USD lead because they cover
    /// ~90% of the target user base; the rest are alphabetical-ish by region.
    public static let allCodes: [String] = [
        "RUB", "USD", "EUR", "TRY", "UZS", "KGS", "CNY", "GBP", "KZT", "AZN"
    ]

    /// Suggests a currency code for the given locale identifier.
    /// Falls back to `"USD"` for anything outside the supported set.
    public static func byLocale(_ locale: String) -> String {
        switch locale {
        case "ru": return "RUB"
        case "en": return "USD"
        case "tr": return "TRY"
        case "uz": return "UZS"
        case "ky": return "KGS"
        case "de", "fr": return "EUR"
        case "zh": return "CNY"
        default: return "USD"
        }
    }

    /// Clamps a device `Locale` to one of `supportedLocales`. Defaults to `"en"`.
    public static func supportedLocale(for locale: Locale) -> String {
        let id = locale.language.languageCode?.identifier.lowercased() ?? "en"
        return supportedLocales.contains(id) ? id : "en"
    }
}
