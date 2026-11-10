import SwiftUI

public enum ReportType: String, CaseIterable, Identifiable, Sendable {
    case arAging          = "ar-aging"
    case apAging          = "ap-aging"
    case salesByCustomer  = "sales-by-customer"
    case salesByProduct   = "sales-by-product"
    case grossProfit      = "gross-profit"

    public var id: String { rawValue }

    public var titleKey: LocalizedStringKey {
        switch self {
        case .arAging:         return "reports.list.arAging.title"
        case .apAging:         return "reports.list.apAging.title"
        case .salesByCustomer: return "reports.list.salesByCustomer.title"
        case .salesByProduct:  return "reports.list.salesByProduct.title"
        case .grossProfit:     return "reports.list.grossProfit.title"
        }
    }

    public var subtitleKey: LocalizedStringKey {
        switch self {
        case .arAging:         return "reports.list.arAging.subtitle"
        case .apAging:         return "reports.list.apAging.subtitle"
        case .salesByCustomer: return "reports.list.salesByCustomer.subtitle"
        case .salesByProduct:  return "reports.list.salesByProduct.subtitle"
        case .grossProfit:     return "reports.list.grossProfit.subtitle"
        }
    }

    public var icon: String {
        switch self {
        case .arAging:         return "dollarsign.circle.fill"
        case .apAging:         return "creditcard.fill"
        case .salesByCustomer: return "person.2.fill"
        case .salesByProduct:  return "shippingbox.fill"
        case .grossProfit:     return "chart.line.uptrend.xyaxis"
        }
    }

    public var accent: Color {
        switch self {
        case .arAging:         return .green
        case .apAging:         return .red
        case .salesByCustomer: return .blue
        case .salesByProduct:  return .orange
        case .grossProfit:     return .purple
        }
    }
}
