import APIClient
import AppShared
import SwiftUI

/// Read-only price-list detail screen with matrix preview.
public struct PriceDetailView: View {
    private let api: any APIClient
    /// Record being displayed.
    public let record: CatalogRecord
    @State private var rows: [CatalogRecord] = []
    @State private var error: String?
    @State private var isLoading = false

    /// Create a detail screen for the given API client and catalog record.
    public init(api: any APIClient, record: CatalogRecord) {
        self.api = api
        self.record = record
    }

    public var body: some View {
        Form {
            Section {
                LabeledContent("prices.detail.name", value: record.name)
                if let code = record.code {
                    LabeledContent("prices.detail.code", value: code)
                }
            }
            if !rows.isEmpty {
                Section("prices.detail.matrix") {
                    ForEach(rows.prefix(50), id: \.id) { row in
                        Text(row.name)
                    }
                }
            } else if let error {
                Section {
                    Text(error)
                        .foregroundStyle(.secondary)
                }
            } else if isLoading {
                Section {
                    ProgressView()
                }
            }
        }
        .navigationTitle("prices.detail.title")
        .task { await load() }
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            // swiftlint:disable nesting
            struct Req: APIRequest {
                typealias Response = CatalogListResponse
                let path: String
                let method: HTTPMethod = .get
                let query: [String: String]?
            }
            // swiftlint:enable nesting
            let response = try await api.send(
                Req(
                    path: "/api/mobile/catalogs/sales.priceAgreement",
                    query: ["priceTypeId": record.id.uuidString]
                )
            )
            rows = response.items
        } catch {
            self.error = String(describing: error)
        }
    }
}
