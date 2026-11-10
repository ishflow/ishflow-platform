import APIClient
import AppShared
import Core
import SwiftUI

/// Price-list catalog screen. Wires up search and pull-to-refresh; rows
/// navigate to a read-only `PriceDetailView`.
public struct PricesListView: View {
    private let api: any APIClient
    @State private var viewModel: PricesListViewModel?

    /// Create a prices list bound to the given API client.
    public init(api: any APIClient) {
        self.api = api
    }

    /// Test-only initializer that injects a pre-built view model so snapshot/preview
    /// tests can render a deterministic loaded state without firing the `.task`
    /// that otherwise constructs the VM lazily.
    public init(api: any APIClient, previewViewModel: PricesListViewModel) {
        self.api = api
        self._viewModel = State(initialValue: previewViewModel)
    }

    public var body: some View {
        NavigationStack {
            list
                .navigationTitle("prices.title")
                .searchable(text: searchBinding, prompt: Text("prices.search.placeholder"))
                .refreshable { await viewModel?.load() }
                .task {
                    if viewModel == nil { viewModel = PricesListViewModel(api: api) }
                    await viewModel?.load()
                }
        }
    }

    private var searchBinding: Binding<String> {
        Binding(
            get: { viewModel?.searchText ?? "" },
            set: { newValue in
                viewModel?.searchText = newValue
            }
        )
    }

    @ViewBuilder
    private var list: some View {
        switch viewModel?.state {
        case .none, .idle, .loading:
            loadingView
        case let .failed(msg):
            ContentUnavailableView(
                "prices.error.title",
                systemImage: "exclamationmark.triangle",
                description: Text(LocalizedStringKey(msg))
            )
        case .loaded:
            let items = viewModel?.filteredItems ?? []
            if items.isEmpty {
                let isFiltered = !(viewModel?.searchText.isEmpty ?? true)
                PricesEmptyView(isFiltered: isFiltered)
            } else {
                List(items, id: \.id) { record in
                    NavigationLink {
                        PriceDetailView(api: api, record: record)
                    } label: {
                        VStack(alignment: .leading) {
                            Text(record.name).font(.headline)
                            if let code = record.code {
                                Text(code).font(.caption).foregroundStyle(.secondary)
                            }
                        }
                        .accessibilityElement(children: .combine)
                    }
                }
                .listStyle(.insetGrouped)
            }
        }
    }

    private var loadingView: some View {
        List {
            ForEach(0 ..< 5) { _ in
                HStack {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.gray.opacity(0.2))
                        .frame(width: 40, height: 40)
                    VStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color.gray.opacity(0.2))
                            .frame(width: 120, height: 16)
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color.gray.opacity(0.2))
                            .frame(width: 80, height: 12)
                    }
                    Spacer()
                }
            }
        }
        .listStyle(.insetGrouped)
        .redacted(reason: .placeholder)
    }
}
