import Foundation

// MARK: - Private formatters

/// Cached formatter for `ActivityItem.eventDate`.
/// `ISO8601DateFormatter` is thread-safe per Apple docs, so one instance is fine.
nonisolated(unsafe) private let _activityTimestampFormatter: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f
}()

// MARK: - DashboardSummary

/// Decoded shape of the GET /api/mobile/dashboard response.
public struct DashboardSummary: Codable, Sendable, Equatable {

    // MARK: Nested types

    public struct TenantInfo: Codable, Sendable, Equatable {
        public let id: String
        public let currency: String
    }

    public struct MoneyKPI: Codable, Sendable, Equatable {
        /// Monetary value as a decimal string (e.g. "1000.50").
        public let value: DecimalString
        /// Percent change vs previous period.
        public let delta: Double
    }

    public struct CountKPI: Codable, Sendable, Equatable {
        /// Integer count value.
        public let value: Int
        /// Percent change vs previous period.
        public let delta: Double
    }

    public struct KPIs: Codable, Sendable, Equatable {
        public let receivable: MoneyKPI
        public let payable: MoneyKPI
        public let thisMonthSales: MoneyKPI
        public let openInvoices: CountKPI
    }

    /// An upcoming or overdue receivable item.
    ///
    /// `date` is a `yyyy-MM-dd` string (e.g. `"2026-05-01"`) — the server
    /// emits the imputed due date via `.toISOString().slice(0, 10)`, which is
    /// NOT a full ISO-8601 timestamp and cannot be decoded directly as `Date`
    /// by `.iso8601`. Expose `dueDate: Date?` as a computed property instead.
    public struct UpcomingReceivable: Codable, Sendable, Equatable, Identifiable {
        public let id: String
        public let name: String
        public let amount: DecimalString
        /// Raw `yyyy-MM-dd` string as emitted by the server.
        public let date: String

        /// Parsed `Date` value. Returns `nil` if the string can't be parsed.
        public var dueDate: Date? {
            var cal = Calendar(identifier: .gregorian)
            cal.timeZone = TimeZone(identifier: "UTC")!
            let comps = date.split(separator: "-")
            guard comps.count == 3,
                  let y = Int(comps[0]), let m = Int(comps[1]), let d = Int(comps[2]) else {
                return nil
            }
            return cal.date(from: DateComponents(year: y, month: m, day: d))
        }

        public init(id: String, name: String, amount: DecimalString, date: String) {
            self.id = id
            self.name = name
            self.amount = amount
            self.date = date
        }
    }

    /// A recent document event.
    ///
    /// `timestamp` is stored as a raw ISO-8601 string with fractional seconds
    /// (e.g. `"2026-04-28T10:00:00.000Z"`) because `JSONDecoder.dateDecodingStrategy
    /// .iso8601` does not handle fractional seconds. Use `eventDate` for a parsed `Date`.
    public struct ActivityItem: Codable, Sendable, Equatable, Identifiable {
        public let id: String
        /// Document kind, e.g. `"sales.invoice"`, `"posted"`, `"paid"`.
        public let kind: String
        /// Display label, e.g. `"#INV-001"`.
        public let label: String
        /// Relative path for deep-linking, e.g. `"/documents/sales.invoice/..."`.
        public let href: String
        /// Raw ISO-8601 timestamp string with fractional seconds.
        public let timestamp: String

        /// Parsed `Date` value. Returns `nil` if the string can't be parsed.
        public var eventDate: Date? {
            _activityTimestampFormatter.date(from: timestamp)
        }

        public init(id: String, kind: String, label: String, href: String, timestamp: String) {
            self.id = id
            self.kind = kind
            self.label = label
            self.href = href
            self.timestamp = timestamp
        }
    }

    public struct LowStock: Codable, Sendable, Equatable {
        public let count: Int
        public let threshold: Int

        public static let empty = LowStock(count: 0, threshold: 5)
    }

    // MARK: Properties

    public let tenant: TenantInfo?
    public let kpis: KPIs?
    public let upcomingReceivables: [UpcomingReceivable]
    public let recentActivity: [ActivityItem]
    public let lowStock: LowStock

    // MARK: Codable

    private enum CodingKeys: String, CodingKey {
        case tenant, kpis, upcomingReceivables, recentActivity, lowStock
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.tenant = try c.decodeIfPresent(TenantInfo.self, forKey: .tenant)
        self.kpis = try c.decodeIfPresent(KPIs.self, forKey: .kpis)
        self.upcomingReceivables = try c.decodeIfPresent([UpcomingReceivable].self, forKey: .upcomingReceivables) ?? []
        self.recentActivity = try c.decodeIfPresent([ActivityItem].self, forKey: .recentActivity) ?? []
        self.lowStock = try c.decodeIfPresent(LowStock.self, forKey: .lowStock) ?? .empty
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encodeIfPresent(tenant, forKey: .tenant)
        try c.encodeIfPresent(kpis, forKey: .kpis)
        // Note: encode always emits these arrays even when tenant==nil (empty arrays).
        // This is intentional asymmetry — the server never round-trips this value,
        // so NICE-TO-HAVE encodeIfPresent semantics are not worth the complexity.
        try c.encode(upcomingReceivables, forKey: .upcomingReceivables)
        try c.encode(recentActivity, forKey: .recentActivity)
        try c.encode(lowStock, forKey: .lowStock)
    }
}
