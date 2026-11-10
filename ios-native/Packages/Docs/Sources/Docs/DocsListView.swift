import APIClient
import AppShared
import Core
import Sales
import SwiftUI

/// Heterogeneous document list — the Docs tab. Aggregates four document
/// kinds via `DocsListViewModel` (parallel fetch + client-side merge),
/// switches the contributing set via the chip filter, and routes taps to
/// per-kind detail views (sales.invoice → SalesDetailView, others →
/// coming-soon).
public struct DocsListView: View {
    private let api: any APIClient
    @Environment(AppSession.self) private var session
    @State private var viewModel: DocsListViewModel?
    @State private var showWizard = false
    @State private var showFilterSheet = false
    @State private var filterDraft = AdvancedFilters()
    /// When non-nil, a saved sales-invoice draft was tapped — present the
    /// resume sheet so the user can keep editing instead of being routed to
    /// the read-only detail view.
    @State private var resumeRow: DocumentSummary?
    private var externalPresent: Binding<Bool>?

    public init(api: any APIClient) {
        self.api = api
    }

    public init(api: any APIClient, presentNewSale: Binding<Bool>) {
        self.api = api
        self.externalPresent = presentNewSale
    }

    public var body: some View {
        NavigationStack {
            // Wrap chip bar + list inside a single VStack pinned to the
            // safe area top. The previous version used .navigationTitle
            // + nested NavigationStack which on iOS 26 occasionally
            // clips the chip bar behind the navigation bar — explicitly
            // declaring .toolbarBackground keeps both visible.
            VStack(spacing: 0) {
                DocsFilterBar(
                    selection: filterBinding,
                    onChange: { Task { await viewModel?.load() } }
                )
                .background(Color(.systemBackground))
                list
            }
            .navigationTitle("docs.tab.title")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.visible, for: .navigationBar)
            #endif
            .refreshable { await viewModel?.load() }
            .rootToolbar()
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        filterDraft = viewModel?.advancedFilters ?? .init()
                        showFilterSheet = true
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "line.3.horizontal.decrease.circle")
                            if let n = viewModel?.advancedFilters.activeCount, n > 0 {
                                Text("\(n)")
                                    .font(.caption.bold())
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 1)
                                    .background(Capsule().fill(Color.accentColor))
                                    .foregroundStyle(.white)
                            }
                        }
                    }
                    .accessibilityIdentifier("docs.filter.advanced")
                }
            }
            .sheet(isPresented: $showWizard) {
                SalesWizardView(api: api)
            }
            .sheet(item: $resumeRow) { row in
                SalesDraftResumeView(api: api, id: row.id)
            }
            .sheet(isPresented: $showFilterSheet) {
                DocsFilterSheet(
                    draft: $filterDraft,
                    api: api,
                    onApply: { applied in
                        viewModel?.advancedFilters = applied
                        Task { await viewModel?.load() }
                    },
                    onReset: {
                        viewModel?.advancedFilters = .init()
                        Task { await viewModel?.load() }
                    }
                )
            }
            .onAppear {
                if externalPresent?.wrappedValue == true {
                    showWizard = true
                    externalPresent?.wrappedValue = false
                }
            }
            .onChange(of: externalPresent?.wrappedValue ?? false) { _, triggered in
                if triggered {
                    showWizard = true
                    externalPresent?.wrappedValue = false
                }
            }
            .task {
                if viewModel == nil {
                    viewModel = DocsListViewModel(
                        api: api,
                        tenantCurrency: { [session] in session.tenant?.currency ?? "USD" }
                    )
                }
                await viewModel?.load()
            }
            .onReceive(NotificationCenter.default.publisher(for: .ishflowDocumentsDidChange)) { _ in
                Task { await viewModel?.load() }
            }
        }
    }

    @ViewBuilder
    private var list: some View {
        switch viewModel?.state {
        case .none, .idle, .loading:
            loadingView
        case let .failed(msg):
            ContentUnavailableView(
                "docs.error.title",
                systemImage: "exclamationmark.triangle",
                description: Text(LocalizedStringKey(msg))
            )
        case let .loaded(rows):
            if rows.isEmpty {
                if (viewModel?.advancedFilters.isEmpty ?? true) {
                    ContentUnavailableView(
                        "docs.empty.title",
                        systemImage: "doc.text",
                        description: Text("docs.empty.description")
                    )
                } else {
                    ContentUnavailableView {
                        Label("docs.filter.emptyResult.title", systemImage: "line.3.horizontal.decrease.circle")
                    } description: {
                        Text("docs.filter.emptyResult.description")
                    } actions: {
                        Button("docs.filter.emptyResult.cta") {
                            viewModel?.advancedFilters = .init()
                            Task { await viewModel?.load() }
                        }
                        .buttonStyle(.borderedProminent)
                    }
                }
            } else {
                List(rows) { row in
                    rowEntry(for: row)
                }
                #if os(iOS)
                .listStyle(.insetGrouped)
                #endif
                .scrollIndicators(.hidden)
            }
        }
    }

    @ViewBuilder
    private func rowEntry(for summary: DocumentSummary) -> some View {
        // Non-posted sales invoices jump straight back into the wizard so
        // the user can keep editing — no intermediate read-only stop. Posted
        // docs and other kinds keep the standard push → detail flow.
        if summary.kind == .salesInvoice,
           summary.status == .draft || summary.status == .saved {
            Button {
                resumeRow = summary
            } label: {
                DocsRow(summary: summary)
            }
            .buttonStyle(.plain)
        } else {
            NavigationLink {
                destination(for: summary)
            } label: {
                DocsRow(summary: summary)
            }
        }
    }

    @ViewBuilder
    private func destination(for summary: DocumentSummary) -> some View {
        switch summary.kind {
        case .salesInvoice:
            SalesDetailView(api: api, id: summary.id)
        default:
            DocumentDetailView(api: api, summary: summary)
        }
    }

    @ViewBuilder
    private var loadingView: some View {
        List(0 ..< 5, id: \.self) { _ in
            HStack(spacing: 12) {
                RoundedRectangle(cornerRadius: 8).fill(Color.gray.opacity(0.2)).frame(width: 36, height: 36)
                VStack(alignment: .leading, spacing: 4) {
                    RoundedRectangle(cornerRadius: 2).fill(Color.gray.opacity(0.2)).frame(width: 140, height: 14)
                    RoundedRectangle(cornerRadius: 2).fill(Color.gray.opacity(0.2)).frame(width: 80, height: 12)
                }
                Spacer()
                RoundedRectangle(cornerRadius: 2).fill(Color.gray.opacity(0.2)).frame(width: 60, height: 14)
            }
            .padding(.vertical, 4)
        }
        #if os(iOS)
        .listStyle(.insetGrouped)
        #endif
        .redacted(reason: .placeholder)
    }

    private var filterBinding: Binding<DocsListViewModel.Filter> {
        Binding(
            get: { viewModel?.filter ?? .all },
            set: { viewModel?.filter = $0 }
        )
    }
}
