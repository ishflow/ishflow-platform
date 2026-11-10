import SwiftUI

public enum ReportPeriod: CaseIterable, Identifiable, Sendable, Hashable {
    case thisWeek
    case thisMonth
    case thisQuarter
    case thisYear

    public var id: String { serverId }

    public var serverId: String {
        switch self {
        case .thisWeek:    return "this-week"
        case .thisMonth:   return "this-month"
        case .thisQuarter: return "this-quarter"
        case .thisYear:    return "this-year"
        }
    }

    public var labelKey: LocalizedStringKey {
        switch self {
        case .thisWeek:    return "reports.period.thisWeek"
        case .thisMonth:   return "reports.period.thisMonth"
        case .thisQuarter: return "reports.period.thisQuarter"
        case .thisYear:    return "reports.period.thisYear"
        }
    }
}
