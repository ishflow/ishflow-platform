import Foundation

/// Decoded shape of the GET /api/mobile/dashboard response (slot/widget layout).
public struct DashboardLayout: Codable, Sendable {

    public struct TenantInfo: Codable, Sendable, Equatable {
        public let id: String
        public let currency: String
    }

    public struct LayoutItem: Codable, Sendable, Identifiable {
        public let slot: Slot
        public let widgets: [Widget]
        public var id: String { slot.rawValue }
    }

    public enum Slot: String, Codable, Sendable {
        case hero, actions, quick, trends, activity
    }

    public struct Widget: Codable, Sendable, Identifiable {
        public let id: String
        public let type: WidgetType
        /// Raw widget payload; consumers switch on `type` and read the
        /// keys they expect via the convenience accessors below.
        public let data: [String: AnyCodable]

        public enum WidgetType: String, Codable, Sendable {
            case kpi, list, chart, quickAction
        }
    }

    // MARK: - Convenience accessors for known widget data shapes

    public let tenant: TenantInfo?
    public let layout: [LayoutItem]

    public init(tenant: TenantInfo?, layout: [LayoutItem]) {
        self.tenant = tenant
        self.layout = layout
    }
}

// MARK: - Widget data helpers

extension DashboardLayout.Widget {

    // MARK: KPI

    public var kpiValue: String? {
        data["value"]?.value as? String
    }

    public var kpiDelta: Double? {
        data["delta"]?.value as? Double
    }

    public var kpiCount: Int? {
        data["count"]?.value as? Int
    }

    public var kpiThreshold: Int? {
        data["threshold"]?.value as? Int
    }

    // MARK: List

    public struct ListItem: Codable, Sendable, Equatable, Identifiable {
        public let id: String
        public let name: String?
        public let amount: String?
        public let date: String?
        public let kind: String?
        public let label: String?
        public let href: String?
        public let timestamp: String?

        public init(
            id: String,
            name: String? = nil,
            amount: String? = nil,
            date: String? = nil,
            kind: String? = nil,
            label: String? = nil,
            href: String? = nil,
            timestamp: String? = nil
        ) {
            self.id = id
            self.name = name
            self.amount = amount
            self.date = date
            self.kind = kind
            self.label = label
            self.href = href
            self.timestamp = timestamp
        }
    }

    public var listItems: [ListItem] {
        guard let raw = data["items"]?.value as? [AnyCodable] else { return [] }
        return raw.compactMap { item in
            guard let dict = item.value as? [String: AnyCodable] else { return nil }
            return ListItem(
                id: dict["id"]?.value as? String ?? "",
                name: dict["name"]?.value as? String,
                amount: dict["amount"]?.value as? String,
                date: dict["date"]?.value as? String,
                kind: dict["kind"]?.value as? String,
                label: dict["label"]?.value as? String,
                href: dict["href"]?.value as? String,
                timestamp: dict["timestamp"]?.value as? String
            )
        }
    }

    // MARK: Chart

    public struct ChartPoint: Codable, Sendable, Equatable {
        public let date: String
        public let value: Double

        public init(date: String, value: Double) {
            self.date = date
            self.value = value
        }
    }

    public var chartPoints: [ChartPoint] {
        guard let raw = data["points"]?.value as? [AnyCodable] else { return [] }
        return raw.compactMap { point in
            guard let dict = point.value as? [String: AnyCodable],
                  let date = dict["date"]?.value as? String,
                  let value = dict["value"]?.value as? Double else { return nil }
            return ChartPoint(date: date, value: value)
        }
    }

    // MARK: Quick Action

    public var quickActionHref: String? {
        data["href"]?.value as? String
    }
}
