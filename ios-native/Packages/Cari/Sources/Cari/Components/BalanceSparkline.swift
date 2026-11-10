import Charts
import SwiftUI

/// Sparkline chart showing customer balance trend over the last 12 weeks.
struct BalanceSparkline: View {
    let trend: [BalanceTrendPoint]
    let currency: String

    var body: some View {
        if trend.isEmpty {
            EmptyView()
        } else {
            Chart(trend) { point in
                LineMark(
                    x: .value("Week", point.weekStart),
                    y: .value("Balance", point.balance)
                )
                .foregroundStyle(.blue)
                AreaMark(
                    x: .value("Week", point.weekStart),
                    y: .value("Balance", point.balance)
                )
                .foregroundStyle(.blue.opacity(0.1))
            }
            .chartYAxis {
                AxisMarks(position: .leading)
            }
            .chartXAxis {
                AxisMarks(values: .automatic(desiredCount: 4))
            }
            .frame(height: 120)
        }
    }
}

extension BalanceTrendPoint: Identifiable {
    public var id: String { weekStart }
}
