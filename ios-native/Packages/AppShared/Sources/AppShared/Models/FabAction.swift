import Foundation

/// A FAB action entry returned by `/api/mobile/me` that drives the centered
/// "+" popover menu.
public struct FabAction: Codable, Sendable, Equatable, Identifiable {
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
