import APIClient
import AppShared
import Core
import SwiftUI

/// Modal picker that loads `purchases.supplier` catalog records and
/// invokes `onPick` when the user taps a row.
public struct SupplierPickerSheet: View {
    private let api: any APIClient
    private let onPick: (CatalogRecord) -> Void
    @State private var items: [CatalogRecord] = []
    @State private var query: String = ""
    @State private var loadState: LoadState = .idle
    @State private var debouncer = SearchDebouncer()

    /// Internal load lifecycle.
    enum LoadState {
        /// Not loaded yet.
        case idle
        /// Network request in flight.
        case loading
        /// Items resolved (possibly empty).
        case loaded
        /// Request failed with a human-readable message.
        case failed(String)
    }

    /// Create a supplier picker bound to the given API client.
    public init(api: any APIClient, onPick: @escaping (CatalogRecord) -> Void) {
        self.api = api
        self.onPick = onPick
    }

    public var body: some View {
        NavigationStack {
            content
                .navigationTitle("picker.supplier.title")
                .searchable(text: $query)
                .onChange(of: query) { _, _ in debouncer.schedule { await load() } }
                .task { await load() }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch loadState {
        case .idle, .loading:
            ProgressView()
        case let .failed(msg):
            ContentUnavailableView(
                "picker.error",
                systemImage: "exclamationmark.triangle",
                description: Text(msg)
            )
        case .loaded:
            if items.isEmpty {
                ContentUnavailableView(
                    "picker.empty",
                    systemImage: "magnifyingglass",
                    description: Text("picker.empty.description")
                )
            } else {
                List(items, id: \.id) { item in
                    Button {
                        onPick(item)
                    } label: {
                        VStack(alignment: .leading) {
                            Text(item.name).font(.headline)
                            if let code = item.code {
                                Text(code).font(.caption).foregroundStyle(.secondary)
                            }
                        }
                    }
                    .accessibilityIdentifier("picker.supplier.\(item.id)")
                }
            }
        }
    }

    private func load() async {
        loadState = .loading
        do {
            // swiftlint:disable nesting
            struct Req: APIRequest {
                typealias Response = CatalogListResponse
                let path = "/api/mobile/catalogs/purchases.supplier"
                let method: HTTPMethod = .get
                let query: [String: String]?
            }
            // swiftlint:enable nesting
            let queryDict: [String: String] = query.isEmpty ? [:] : ["q": query]
            let resp = try await api.send(Req(query: queryDict))
            items = resp.items
            loadState = .loaded
        } catch {
            loadState = .failed(String(describing: error))
        }
    }
}
