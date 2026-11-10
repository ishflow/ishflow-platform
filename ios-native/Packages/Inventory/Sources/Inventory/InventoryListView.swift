import APIClient
import AppShared
import Core
import SwiftUI

/// Inventory stock list screen. Shows balance rows from the
/// `inventory.stock` register; the search field filters by product name
/// client-side, the chip bar filters by stock status, and an advanced
/// filter sheet adds category + group multi-select on top.
public struct InventoryListView: View {
    private let api: any APIClient
    @State private var viewModel: InventoryListViewModel?
    @State private var showScanner = false
    @State private var showFilterSheet = false
    @State private var filterDraft = InventoryListViewModel.AdvancedFilters()

    /// Create an inventory list bound to the given API client.
    public init(api: any APIClient) {
        self.api = api
    }

    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                filterToolbar
                contentBelowToolbar
            }
            .navigationTitle("inventory.title")
            .searchable(text: searchBinding, prompt: Text("inventory.search.placeholder"))
            .refreshable { await viewModel?.load() }
            .rootToolbar()
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button {
                        filterDraft = viewModel?.advancedFilters ?? .init()
                        showFilterSheet = true
                    } label: {
                        ZStack(alignment: .topTrailing) {
                            Image(systemName: "line.3.horizontal.decrease.circle")
                            if let n = viewModel?.advancedFilters.activeCount, n > 0 {
                                Text("\(n)")
                                    .font(.caption2.bold())
                                    .padding(.horizontal, 5)
                                    .padding(.vertical, 1)
                                    .background(Capsule().fill(Color.accentColor))
                                    .foregroundStyle(.white)
                                    .offset(x: 8, y: -6)
                            }
                        }
                    }
                    .accessibilityLabel("inventory.filter.advanced")
                    .accessibilityIdentifier("inventory.filter.advanced")
                    Button {
                        showScanner = true
                    } label: {
                        Image(systemName: "barcode.viewfinder")
                    }
                    .accessibilityLabel("inventory.barcode.scanning")
                }
            }
            .sheet(isPresented: $showScanner) {
                BarcodeScanView { code in
                    showScanner = false
                    viewModel?.searchText = code
                }
            }
            .sheet(isPresented: $showFilterSheet) {
                InventoryAdvancedFilterSheet(
                    draft: $filterDraft,
                    categories: viewModel?.categories ?? [],
                    groups: viewModel?.groups ?? [],
                    categoriesError: viewModel?.categoriesError,
                    groupsError: viewModel?.groupsError,
                    onApply: { applied in
                        viewModel?.advancedFilters = applied
                    },
                    onReset: {
                        viewModel?.advancedFilters = InventoryListViewModel.AdvancedFilters()
                    }
                )
            }
            .task {
                if viewModel == nil { viewModel = InventoryListViewModel(api: api) }
                await viewModel?.load()
            }
        }
    }

    /// Persistent chip bar that sits OUTSIDE the List so it stays visible
    /// even when the filtered result is empty (previously rendered inside
    /// the List as a header, so flipping to "Düşük stok" with no matches
    /// would hide the chip bar and trap the user in the empty view).
    /// The advanced-filter button now lives in the navigation bar trailing
    /// group next to the barcode scanner.
    @ViewBuilder
    private var filterToolbar: some View {
        HStack(spacing: 0) {
            InventoryFilterChipRow(selection: chipBinding)
            Spacer(minLength: 0)
        }
        .padding(.vertical, 8)
        .background(Color(.systemBackground))
    }

    private var chipBinding: Binding<InventoryListViewModel.InventoryFilter> {
        Binding(
            get: { viewModel?.activeFilter ?? .all },
            set: { viewModel?.activeFilter = $0 }
        )
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
    private var contentBelowToolbar: some View {
        switch viewModel?.state {
        case .none, .idle, .loading:
            loadingView
        case let .failed(msg):
            ContentUnavailableView(
                "inventory.error.title",
                systemImage: "exclamationmark.triangle",
                description: Text(LocalizedStringKey(msg))
            )
        case .loaded:
            let rows = viewModel?.filteredRows ?? []
            if rows.isEmpty {
                let isFiltered = !(viewModel?.searchText.isEmpty ?? true) ||
                    (viewModel?.activeFilter != .all) ||
                    !(viewModel?.advancedFilters.isEmpty ?? true)
                InventoryEmptyView(isFiltered: isFiltered)
            } else {
                List {
                    ForEach(rows.indices, id: \.self) { index in
                        let row = rows[index]
                        let productId = row.groupKey["product"].flatMap(UUID.init(uuidString:))
                        if let productId {
                            NavigationLink {
                                ProductDetailView(api: api, id: productId)
                            } label: {
                                inventoryRow(row)
                            }
                        } else {
                            inventoryRow(row)
                        }
                    }
                }
                .listStyle(.insetGrouped)
            }
        }
    }

    private func inventoryRow(_ row: RegisterBalanceRow) -> some View {
        HStack {
            VStack(alignment: .leading) {
                Text(row.groupLabels?["product"] ?? row.groupKey["product"] ?? "—")
                    .font(.headline)
                if let warehouse = row.groupLabels?["warehouse"] ?? row.groupKey["warehouse"] {
                    Text(warehouse).font(.caption).foregroundStyle(.secondary)
                }
            }
            Spacer()
            if let quantity = row.quantity?.value {
                Text(quantity, format: .number).font(.body)
            }
        }
        .accessibilityElement(children: .combine)
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
