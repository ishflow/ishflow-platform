import AppShared
import Foundation

/// Weekly balance trend point for the sparkline chart.
public struct BalanceTrendPoint: Codable, Sendable, Equatable {
    /// ISO date of the week start (Monday).
    public let weekStart: String
    /// Running balance at end of week.
    public let balance: Double

    public init(weekStart: String, balance: Double) {
        self.weekStart = weekStart
        self.balance = balance
    }
}

/// Invoice summary inside Counterparty 360 (sales invoice for customers,
/// purchase invoice for suppliers).
public struct Customer360Invoice: Codable, Sendable, Equatable, Identifiable {
    public let id: String
    public let number: String
    public let date: String
    public let status: String
    public let postedAt: String?
    public let total: Double
}

/// Payment summary inside Counterparty 360 (payment_received for customers,
/// payment_sent for suppliers).
public struct Customer360Payment: Codable, Sendable, Equatable, Identifiable {
    public let id: String
    public let number: String
    public let date: String
    public let amount: Double
    public let status: String
    public let postedAt: String?
}

/// Aggregated Counterparty 360 response payload.
///
/// Returned by `/api/mobile/counterparty-360/{id}?type=customer|supplier`.
/// The shape is identical for both kinds; supplier payloads simply leave
/// `code` + `address` as `nil`.
public struct Customer360Response: Codable, Sendable {
    public let type: CounterpartyType
    public let counterparty: Customer360Customer
    public let balance: Double
    public let currency: String
    public let balanceTrend: [BalanceTrendPoint]
    public let invoices: [Customer360Invoice]
    public let payments: [Customer360Payment]
    public let stockOuts: [Customer360StockOut]
}

/// Counterparty identity subset — same shape for customer and supplier.
public struct Customer360Customer: Codable, Sendable {
    public let id: String
    public let code: String?
    public let name: String
    public let phone: String?
    public let email: String?
    public let address: String?
}

/// Stock-out placeholder (document type not yet available).
public struct Customer360StockOut: Codable, Sendable, Equatable, Identifiable {
    public let id: String
    public init(id: String) { self.id = id }
}
