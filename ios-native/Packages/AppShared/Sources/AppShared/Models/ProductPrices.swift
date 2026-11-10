import Foundation

/// One row returned by GET /api/mobile/products/:id/prices — the per-product
/// resolved price for a single price-type.
public struct ProductPriceItem: Codable, Sendable, Equatable {
    /// Price-type catalog id.
    public let priceTypeId: String
    /// Display name of the price-type.
    public let priceTypeName: String
    /// "static" or "dynamic" (markup-based). Optional because legacy rows
    /// may omit it.
    public let kind: String?
    /// Tenant's default price-type flag.
    public let isDefault: Bool
    /// Resolved price for this (product, priceType) at "now".
    public let value: DecimalString

    public init(
        priceTypeId: String,
        priceTypeName: String,
        kind: String?,
        isDefault: Bool,
        value: DecimalString
    ) {
        self.priceTypeId = priceTypeId
        self.priceTypeName = priceTypeName
        self.kind = kind
        self.isDefault = isDefault
        self.value = value
    }
}

/// GET /api/mobile/products/:id/prices envelope.
public struct ProductPricesResponse: Codable, Sendable, Equatable {
    public let items: [ProductPriceItem]

    public init(items: [ProductPriceItem]) {
        self.items = items
    }
}
