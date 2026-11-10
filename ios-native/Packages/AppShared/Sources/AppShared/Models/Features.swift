import Foundation

/// Tenant feature flags.
public struct MobileFeatures: Codable, Sendable, Equatable {
    /// Sales module enabled.
    public let sales: Bool
    /// Prices module enabled.
    public let prices: Bool
    /// Inventory module enabled.
    public let inventory: Bool
    /// Purchases module enabled (optional / future).
    public let purchases: Bool?
    /// Payments module enabled (optional / future).
    public let payments: Bool?

    /// Initialize feature flags with sensible defaults.
    public init(
        sales: Bool = true,
        prices: Bool = true,
        inventory: Bool = true,
        purchases: Bool? = nil,
        payments: Bool? = nil
    ) {
        self.sales = sales
        self.prices = prices
        self.inventory = inventory
        self.purchases = purchases
        self.payments = payments
    }
}
