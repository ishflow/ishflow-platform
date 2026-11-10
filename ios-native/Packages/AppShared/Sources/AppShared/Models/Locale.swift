import Foundation

// swiftlint:disable identifier_name
/// Supported app locale.
public enum AppLocale: String, Codable, Sendable, CaseIterable {
    /// Russian (default).
    case ru
    /// English (fallback).
    case en
    /// Turkish.
    case tr
    /// Uzbek.
    case uz
    /// Kyrgyz.
    case ky
    /// German.
    case de
    /// French.
    case fr
    /// Chinese.
    case zh
}

// swiftlint:enable identifier_name

/// /api/mobile/i18n/:locale payload.
public struct MessagesResponse: Codable, Sendable {
    /// Locale of the catalog.
    public let locale: AppLocale
    /// Flat or nested message catalog.
    public let messages: [String: AnyCodable]
}
