import Foundation

/// A tab entry returned by `/api/mobile/me` that drives the bottom-tab bar.
public struct MobileTab: Codable, Sendable, Equatable, Identifiable {
    public let id: String
    public let icon: String
    public let labelKey: String
    public let order: Int

    public init(id: String, icon: String, labelKey: String, order: Int) {
        self.id = id
        self.icon = icon
        self.labelKey = labelKey
        self.order = order
    }
}
