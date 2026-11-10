import APIClient
import AppShared
import Core
import SwiftUI

/// Cari (counterparties) list screen. Wires up a customer/supplier segment
/// picker, debounced search, pull-to-refresh, and per-row navigation into
/// the (forthcoming) counterparty detail view. Mirrors the structure of
/// `SalesListView` for consistency with the rest of the tab bar.
public struct CariView: View {
    private let api: any APIClient
    @State private var viewModel: CariViewModel?
    @State private var debouncer = SearchDebouncer()

    /// Create a Cari list bound to the given API client.
    public init(api: any APIClient) {
        self.api = api
    }

    /// Test-only initializer that injects a pre-built view model so preview/
    /// integration tests can render a deterministic state without firing the
    /// `.task` that otherwise constructs the VM lazily.
    public init(api: any APIClient, previewViewModel: CariViewModel) {
        self.api = api
        self._viewModel = State(initialValue: previewViewModel)
    }

    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("cari.segment.title", selection: segmentBinding) {
                    Text("cari.segment.customers").tag(CounterpartyType.customer)
                    Text("cari.segment.suppliers").tag(CounterpartyType.supplier)
                }
                .pickerStyle(.segmented)
                .accessibilityIdentifier("cari.segment")
                .accessibilityLabel("cari.segment.title")
                .padding(.horizontal)
                .padding(.vertical, 8)

                list
            }
            .navigationTitle("shell.tab.cari")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .searchable(text: searchBinding)
            .refreshable { await viewModel?.load() }
            .rootToolbar()
            .task {
                if viewModel == nil { viewModel = CariViewModel(api: api) }
                await viewModel?.load()
            }
        }
    }

    private var segmentBinding: Binding<CounterpartyType> {
        Binding(
            get: { viewModel?.segment ?? .customer },
            set: { newValue in
                viewModel?.segment = newValue
                Task { await viewModel?.load() }
            }
        )
    }

    private var searchBinding: Binding<String> {
        Binding(
            get: { viewModel?.query ?? "" },
            set: { newValue in
                viewModel?.query = newValue
                debouncer.schedule { await viewModel?.load() }
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
                "cari.error.title",
                systemImage: "exclamationmark.triangle",
                description: Text(LocalizedStringKey(msg))
            )
        case let .loaded(items):
            if items.isEmpty {
                emptyView
            } else {
                List(items) { counterparty in
                    NavigationLink {
                        Customer360View(
                            api: api,
                            counterparty: counterparty,
                            type: viewModel?.segment ?? .customer
                        )
                    } label: {
                        CounterpartyRow(counterparty: counterparty)
                    }
                }
                #if os(iOS)
                .listStyle(.insetGrouped)
                #endif
            }
        }
    }

    @ViewBuilder
    private var emptyView: some View {
        let segment = viewModel?.segment ?? .customer
        let titleKey: LocalizedStringKey = segment == .customer
            ? "cari.empty.customers.title"
            : "cari.empty.suppliers.title"
        ContentUnavailableView(
            titleKey,
            systemImage: "person.2",
            description: Text("cari.empty.description")
        )
    }

    @ViewBuilder
    private var loadingView: some View {
        List {
            ForEach(0 ..< 5) { _ in
                HStack(alignment: .top, spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color.gray.opacity(0.2))
                            .frame(width: 140, height: 16)
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color.gray.opacity(0.2))
                            .frame(width: 80, height: 12)
                    }
                    Spacer()
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color.gray.opacity(0.2))
                        .frame(width: 70, height: 16)
                }
                .padding(.vertical, 6)
            }
        }
        #if os(iOS)
        .listStyle(.insetGrouped)
        #endif
        .redacted(reason: .placeholder)
    }
}
