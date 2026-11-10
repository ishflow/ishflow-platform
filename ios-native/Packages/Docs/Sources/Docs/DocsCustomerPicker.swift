import APIClient
import AppShared
import SwiftUI

/// Searchable multi-select list of sales counterparties. Bound to a
/// `Set<String>` of counterparty IDs that the parent `DocsFilterSheet`
/// owns — toggling a row mutates the binding directly.
struct DocsCustomerPicker: View {
    let api: any APIClient
    @Binding var selection: Set<String>

    @State private var rows: [CounterpartyRow] = []
    @State private var loadState: LoadState = .idle
    @State private var search: String = ""

    enum LoadState { case idle, loading, loaded, failed(String) }

    struct CounterpartyRow: Identifiable, Hashable {
        let id: String
        let name: String
        let code: String?
    }

    var body: some View {
        List {
            ForEach(filteredRows) { row in
                Button {
                    toggle(row.id)
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(row.name).foregroundStyle(.primary)
                            if let code = row.code, !code.isEmpty {
                                Text(code).font(.caption).foregroundStyle(.secondary)
                            }
                        }
                        Spacer()
                        if selection.contains(row.id) {
                            Image(systemName: "checkmark").foregroundStyle(.tint)
                        }
                    }
                }
                .accessibilityIdentifier("docs.filter.customer.row.\(row.id)")
            }
            if case .loading = loadState {
                ProgressView()
            }
            if case let .failed(msg) = loadState {
                Text(msg).foregroundStyle(.red)
            }
        }
        .searchable(text: $search, prompt: Text("docs.filter.search.prompt"))
        .navigationTitle("docs.filter.customer")
        .task { await load() }
    }

    private var filteredRows: [CounterpartyRow] {
        let trimmed = search.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !trimmed.isEmpty else { return rows }
        return rows.filter { r in
            r.name.lowercased().contains(trimmed)
                || (r.code?.lowercased().contains(trimmed) ?? false)
        }
    }

    private func toggle(_ id: String) {
        if selection.contains(id) {
            selection.remove(id)
        } else {
            selection.insert(id)
        }
    }

    private func load() async {
        loadState = .loading
        do {
            let req = CounterpartyListRequest(type: "customer", pageSize: 200)
            let resp = try await api.send(req)
            rows = resp.items.map {
                CounterpartyRow(id: $0.id.uuidString, name: $0.name, code: $0.code)
            }
            loadState = .loaded
        } catch {
            loadState = .failed(String(describing: error))
        }
    }
}

private struct CounterpartyListRequest: APIRequest {
    typealias Response = CounterpartyListResponse

    let type: String
    let pageSize: Int

    var path: String { "/api/mobile/counterparties" }
    var method: HTTPMethod { .get }
    var query: [String: String]? {
        ["type": type, "pageSize": String(pageSize)]
    }
}
