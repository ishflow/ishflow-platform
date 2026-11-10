import Foundation

/// Counterparty kind discriminator.
///
/// Mirrors the `customer` / `supplier` taxonomy used by the web app.
public enum CounterpartyType: String, Codable, Sendable, CaseIterable {
    case customer
    case supplier
}

/// Direction of an outstanding A/R or A/P balance.
///
/// Encoded server-side as a string so the client can render the right
/// label without doing sign math on a possibly-zero decimal.
public enum BalanceDirection: String, Codable, Sendable {
    /// Counterparty owes us money (A/R debit).
    case owesUs
    /// We owe the counterparty money (A/P debit).
    case weOwe
    /// Net zero — no outstanding balance either way.
    case zero
}

/// Counterparty list row returned by the Cari endpoint.
///
/// Pairs a catalog-level identity (id / code / name) with a denormalized
/// balance snapshot (`balance`, `balanceDirection`, `currency`) so the
/// list view can render without a follow-up register query per row.
public struct Counterparty: Codable, Sendable, Equatable, Identifiable {
    /// Counterparty identifier.
    public let id: UUID
    /// Optional business code.
    public let code: String?
    /// Display name.
    public let name: String
    /// Outstanding balance magnitude (always non-negative).
    public let balance: DecimalString
    /// Whether the counterparty owes us, we owe them, or it nets to zero.
    public let balanceDirection: BalanceDirection
    /// ISO 4217 currency code for `balance`.
    public let currency: String

    /// Construct a counterparty row from raw fields.
    public init(
        id: UUID,
        code: String?,
        name: String,
        balance: DecimalString,
        balanceDirection: BalanceDirection,
        currency: String
    ) {
        self.id = id
        self.code = code
        self.name = name
        self.balance = balance
        self.balanceDirection = balanceDirection
        self.currency = currency
    }
}

/// Paginated list of counterparties.
public typealias CounterpartyListResponse = PaginatedResponse<Counterparty>
