import APIClient
import AppShared
import SwiftUI

public struct ReportDetailView: View {
    private let api: any APIClient
    public let type: ReportType
    @State private var period: ReportPeriod = .thisMonth
    @State private var vm: ReportDetailViewModel

    public init(api: any APIClient, type: ReportType) {
        self.api = api
        self.type = type
        _vm = State(wrappedValue: ReportDetailViewModel(api: api, type: type))
    }

    public var body: some View {
        List {
            Section {
                ReportPeriodPicker(period: $period)
                    .listRowInsets(EdgeInsets(top: 8, leading: 0, bottom: 8, trailing: 0))
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
            }

            if let summary = vm.summary {
                heroSection(summary)
                breakdownSection(summary)
            } else if vm.isLoading {
                Section {
                    HStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                    .padding(.vertical, 40)
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
                }
            } else if let err = vm.error {
                Section {
                    ContentUnavailableView {
                        Label("reports.error.title", systemImage: "exclamationmark.triangle")
                    } description: {
                        Text(err)
                    } actions: {
                        Button("reports.error.retry") {
                            Task { await vm.load(period: period) }
                        }
                        .buttonStyle(.bordered)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle(type.titleKey)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                ReportShareMenu(type: type, period: period)
            }
        }
        .task(id: period) {
            await vm.load(period: period)
        }
    }

    @ViewBuilder
    private func heroSection(_ summary: ReportSummary) -> some View {
        Section {
            VStack(alignment: .leading, spacing: 6) {
                Text(summary.hero.value, format: .currency(code: summary.currency))
                    .font(.system(size: 32, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.primary)
                if let pct = summary.hero.deltaPct {
                    HStack(spacing: 4) {
                        Image(systemName: arrowName(summary.hero.deltaSign))
                        Text(String(format: "%.1f%%", abs(pct)))
                            .monospacedDigit()
                        Text(deltaLabelKey(summary.hero.deltaSign))
                            .foregroundStyle(.secondary)
                    }
                    .font(.footnote)
                    .foregroundStyle(arrowColor(summary.hero.deltaSign))
                }
            }
            .padding(.vertical, 4)
        }
    }

    @ViewBuilder
    private func breakdownSection(_ summary: ReportSummary) -> some View {
        Section("reports.section.detail") {
            ForEach(summary.breakdown) { item in
                LabeledContent {
                    Text(item.value, format: .currency(code: summary.currency))
                        .monospacedDigit()
                } label: {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.label)
                            .lineLimit(1)
                        if let bucket = item.meta?.bucket {
                            Text(bucket.labelKey)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
    }

    private func arrowName(_ sign: ReportSummary.DeltaSign) -> String {
        switch sign {
        case .up:   return "arrow.up.right"
        case .down: return "arrow.down.right"
        case .flat: return "arrow.right"
        }
    }

    private func arrowColor(_ sign: ReportSummary.DeltaSign) -> Color {
        switch sign {
        case .up:   return .green
        case .down: return .red
        case .flat: return .secondary
        }
    }

    private func deltaLabelKey(_ sign: ReportSummary.DeltaSign) -> LocalizedStringKey {
        switch sign {
        case .up:   return "reports.hero.delta.up"
        case .down: return "reports.hero.delta.down"
        case .flat: return "reports.hero.delta.flat"
        }
    }
}
