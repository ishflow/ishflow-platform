import Foundation

/// Single register balance row.
///
/// The backend ships register resources keyed by whatever the register
/// config declares (e.g. `amount` for A/R + A/P, `quantity` + `totalCost`
/// for `inventory.stock_balance`). To stay decoupled from any specific
/// register's resource names, we capture every numeric resource into
/// `resources` (a `String` → `DecimalString` map) and expose convenience
/// accessors for the common shapes the iOS app cares about today.
public struct RegisterBalanceRow: Codable, Sendable, Equatable {
    /// Composite group key (e.g. {"warehouseId": "wh-1"}).
    public let groupKey: [String: String]
    /// Optional human-readable labels for each ref dimension in `groupKey`.
    ///
    /// Backend ships display strings (e.g. "Main warehouse") alongside
    /// the raw IDs so list rows can show counterparty / warehouse /
    /// product names without a second lookup.
    public let groupLabels: [String: String]?
    /// Every numeric resource on this row, keyed by register-config name.
    public let resources: [String: DecimalString]

    /// Generic accumulating balance — sums any resource named `amount`,
    /// `value`, or `revenue` (the three keys ishflow uses for "money on a
    /// counterparty register" today). `nil` if none of those keys exist.
    public var amount: DecimalString? {
        resources["amount"] ?? resources["revenue"] ?? resources["value"]
    }

    /// Quantity-style resource (stock_balance).
    public var quantity: DecimalString? { resources["quantity"] }
    /// Cost-style resource (stock_balance.totalCost or sale.cost).
    public var cost: DecimalString? { resources["totalCost"] ?? resources["cost"] }
    /// Revenue-style resource (sales.sale).
    public var revenue: DecimalString? { resources["revenue"] ?? resources["amount"] }

    public init(
        groupKey: [String: String],
        groupLabels: [String: String]? = nil,
        resources: [String: DecimalString] = [:]
    ) {
        self.groupKey = groupKey
        self.groupLabels = groupLabels
        self.resources = resources
    }

    private enum CodingKeys: String, CodingKey {
        case groupKey
        case groupLabels
    }

    private struct AnyKey: CodingKey {
        var stringValue: String
        var intValue: Int? { nil }
        init(stringValue: String) { self.stringValue = stringValue }
        init?(intValue _: Int) { nil }
    }

    public init(from decoder: Decoder) throws {
        let keyed = try decoder.container(keyedBy: CodingKeys.self)
        groupKey = try keyed.decode([String: String].self, forKey: .groupKey)
        groupLabels = try keyed.decodeIfPresent([String: String].self, forKey: .groupLabels)

        // The same row also carries register-resource fields at the top
        // level. We re-open the container with `AnyKey` so we can sweep
        // every key the server emitted and capture the ones whose value
        // decodes as a `DecimalString` (i.e. a numeric string literal).
        let dynamic = try decoder.container(keyedBy: AnyKey.self)
        var collected: [String: DecimalString] = [:]
        for key in dynamic.allKeys {
            if key.stringValue == "groupKey" || key.stringValue == "groupLabels" { continue }
            if let value = try? dynamic.decode(DecimalString.self, forKey: key) {
                collected[key.stringValue] = value
            }
        }
        resources = collected
    }

    public func encode(to encoder: Encoder) throws {
        var keyed = encoder.container(keyedBy: CodingKeys.self)
        try keyed.encode(groupKey, forKey: .groupKey)
        try keyed.encodeIfPresent(groupLabels, forKey: .groupLabels)
        var dynamic = encoder.container(keyedBy: AnyKey.self)
        for (k, v) in resources {
            try dynamic.encode(v, forKey: AnyKey(stringValue: k))
        }
    }
}

/// Register balance endpoint response.
public struct RegisterBalanceResponse: Codable, Sendable, Equatable {
    /// Register identifier (e.g. "inventory.stock").
    public let register: String
    /// Optional as-of timestamp.
    public let asOf: Date?
    /// Aggregated rows.
    public let rows: [RegisterBalanceRow]
}
