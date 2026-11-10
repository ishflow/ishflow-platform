import APIClient
import AppShared
import SwiftUI

public struct ReportsListView: View {
    private let api: any APIClient
    @Environment(AppSession.self) private var session

    public init(api: any APIClient) {
        self.api = api
    }

    public var body: some View {
        Group {
            if hasReportsRead {
                List {
                    Section {
                        ForEach(ReportType.allCases) { type in
                            NavigationLink {
                                ReportDetailView(api: api, type: type)
                            } label: {
                                ReportRow(type: type)
                            }
                        }
                    }
                }
                .listStyle(.insetGrouped)
            } else {
                ContentUnavailableView(
                    "reports.gated.title",
                    systemImage: "lock",
                    description: Text("reports.gated.message")
                )
            }
        }
        .navigationTitle("reports.title")
        .navigationBarTitleDisplayMode(.large)
    }

    private var hasReportsRead: Bool {
        session.permissions.contains("reports:read")
    }
}

private struct ReportRow: View {
    let type: ReportType

    var body: some View {
        Label {
            VStack(alignment: .leading, spacing: 2) {
                Text(type.titleKey)
                    .font(.body)
                    .foregroundStyle(.primary)
                Text(type.subtitleKey)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        } icon: {
            Image(systemName: type.icon)
                .foregroundStyle(.white)
                .font(.system(size: 14, weight: .semibold))
                .frame(width: 28, height: 28)
                .background(type.accent)
                .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
        }
        .padding(.vertical, 2)
    }
}
