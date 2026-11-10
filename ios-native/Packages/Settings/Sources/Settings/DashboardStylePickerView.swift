import AppShared
import SwiftUI

/// Settings → Görünüm → Dashboard Stili. Lists the three layout variants
/// (Klasik / Modern / Analitik) with a checkmark on the active one. Tap
/// updates the shared `AppStorage("dashboardStyle")` key — every dashboard
/// reads the same key, so the home tab swaps as soon as the user pops back.
public struct DashboardStylePickerView: View {
    @AppStorage(DashboardStyleStorage.key)
    private var rawStyle: String = DashboardStyleStorage.defaultStyle.rawValue

    public init() {}

    private var current: DashboardStyle {
        DashboardStyle(rawValue: rawStyle) ?? DashboardStyleStorage.defaultStyle
    }

    public var body: some View {
        List {
            Section {
                ForEach(DashboardStyle.allCases) { style in
                    Button {
                        rawStyle = style.rawValue
                    } label: {
                        row(for: style)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("settings.dashboardStyle.title")
        .navigationBarTitleDisplayMode(.inline)
    }

    @ViewBuilder
    private func row(for style: DashboardStyle) -> some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Text(style.labelKey)
                    .font(.body)
                    .foregroundStyle(.primary)
                Text(style.summaryKey)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            if style == current {
                Image(systemName: "checkmark")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(.tint)
            }
        }
        .padding(.vertical, 4)
        .contentShape(Rectangle())
    }
}
