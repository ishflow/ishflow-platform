import Foundation
import SwiftUI

public struct ReportSummary: Decodable, Equatable, Sendable {
    public let type: ReportType
    public let period: Period
    public let currency: String
    public let hero: Hero
    public let breakdown: [Item]

    public init(
        type: ReportType,
        period: Period,
        currency: String,
        hero: Hero,
        breakdown: [Item]
    ) {
        self.type = type
        self.period = period
        self.currency = currency
        self.hero = hero
        self.breakdown = breakdown
    }

    private enum CodingKeys: String, CodingKey {
        case type, period, currency, hero, breakdown
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let raw = try c.decode(String.self, forKey: .type)
        guard let parsed = ReportType(rawValue: raw) else {
            throw DecodingError.dataCorruptedError(
                forKey: .type,
                in: c,
                debugDescription: "Unknown ReportType raw value: \(raw)"
            )
        }
        self.type = parsed
        self.period = try c.decode(Period.self, forKey: .period)
        self.currency = try c.decode(String.self, forKey: .currency)
        self.hero = try c.decode(Hero.self, forKey: .hero)
        self.breakdown = try c.decode([Item].self, forKey: .breakdown)
    }

    public struct Period: Decodable, Equatable, Sendable {
        public let from: String
        public let to: String
        public let label: String

        public init(from: String, to: String, label: String) {
            self.from = from
            self.to = to
            self.label = label
        }
    }

    public struct Hero: Decodable, Equatable, Sendable {
        public let value: Double
        public let deltaPct: Double?
        public let deltaSign: DeltaSign

        public init(value: Double, deltaPct: Double?, deltaSign: DeltaSign) {
            self.value = value
            self.deltaPct = deltaPct
            self.deltaSign = deltaSign
        }
    }

    public enum DeltaSign: String, Decodable, Sendable {
        case up, down, flat
    }

    public struct Item: Decodable, Equatable, Identifiable, Sendable {
        public let id: String
        public let label: String
        public let value: Double
        public let meta: Meta?

        public init(id: String, label: String, value: Double, meta: Meta? = nil) {
            self.id = id
            self.label = label
            self.value = value
            self.meta = meta
        }
    }

    public struct Meta: Decodable, Equatable, Sendable {
        public let bucket: Bucket?
        public let count: Int?

        public init(bucket: Bucket? = nil, count: Int? = nil) {
            self.bucket = bucket
            self.count = count
        }
    }

    public enum Bucket: String, Decodable, Sendable {
        case b0to30  = "0-30"
        case b31to60 = "31-60"
        case b61to90 = "61-90"
        case b90plus = "90+"

        public var labelKey: LocalizedStringKey {
            switch self {
            case .b0to30:  return "reports.bucket.0to30"
            case .b31to60: return "reports.bucket.31to60"
            case .b61to90: return "reports.bucket.61to90"
            case .b90plus: return "reports.bucket.90plus"
            }
        }
    }
}
