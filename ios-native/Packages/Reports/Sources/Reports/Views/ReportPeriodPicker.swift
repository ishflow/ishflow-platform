import SwiftUI

public struct ReportPeriodPicker: View {
    @Binding var period: ReportPeriod

    public init(period: Binding<ReportPeriod>) {
        self._period = period
    }

    public var body: some View {
        Picker("reports.period.title", selection: $period) {
            ForEach(ReportPeriod.allCases) { p in
                Text(p.labelKey).tag(p)
            }
        }
        .pickerStyle(.segmented)
    }
}
