import APIClient
import AppShared
import Core
import SwiftUI

/// Sales invoice list screen. Wires up search, pull-to-refresh, and a
/// toolbar entry point to the wizard. Rows navigate to `SalesDetailView`.
public struct SalesListView: View {
    private let api: any APIClient
    @State private var viewModel: SalesListViewModel?
    @State private var showWizard = false
    @State private var debouncer = SearchDebouncer()
    /// Optional external trigger — set to `true` from outside (e.g. Dashboard FAB)
    /// to programmatically open the new-sale wizard.
    private var externalPresent: Binding<Bool>?

    /// Create a sales list bound to the given API client.
    public init(api: any APIClient) {
        self.api = api
    }

    /// Create a sales list with an external "present new sale" trigger.
    /// Setting the binding to `true` opens the wizard sheet.
    public init(api: any APIClient, presentNewSale: Binding<Bool>) {
        self.api = api
        self.externalPresent = presentNewSale
    }

    /// Test-only initializer that injects a pre-built view model so snapshot/preview
    /// tests can render a deterministic loaded state without firing the `.task`
    /// that otherwise constructs the VM lazily.
    public init(api: any APIClient, previewViewModel: SalesListViewModel) {
        self.api = api
        self._viewModel = State(initialValue: previewViewModel)
    }

    public var body: some View {
        NavigationStack {
            list
                .navigationTitle("sales.title")
                .searchable(text: searchBinding)
                .refreshable { await viewModel?.load() }
                .rootToolbar()
                .toolbar {
                    Button {
                        showWizard = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                    }
                    .accessibilityLabel("sales.newInvoice")
                    .accessibilityIdentifier("sales.newInvoice")
                }
                .sheet(isPresented: $showWizard) {
                    SalesWizardView(api: api)
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
                    if viewModel == nil { viewModel = SalesListViewModel(api: api) }
                    await viewModel?.load()
                }
                .onReceive(NotificationCenter.default.publisher(for: .ishflowDocumentsDidChange)) { _ in
                    Task { await viewModel?.load() }
                }
        }
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
                "sales.error.title",
                systemImage: "exclamationmark.triangle",
                description: Text(LocalizedStringKey(msg))
            )
        case let .loaded(docs):
            if docs.isEmpty {
                ContentUnavailableView(
                    "sales.empty.title",
                    systemImage: "doc.text",
                    description: Text("sales.empty.description")
                )
            } else {
                List(docs, id: \.id) { doc in
                    NavigationLink {
                        SalesDetailView(api: api, id: doc.id)
                    } label: {
                        DocumentRowAdapter(record: doc)
                    }
                }
                #if os(iOS)
                .listStyle(.insetGrouped)
                #endif
            }
        }
    }

    @ViewBuilder
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
        #if os(iOS)
        .listStyle(.insetGrouped)
        #endif
        .redacted(reason: .placeholder)
    }
}

struct DocumentRowAdapter: View {
    let record: DocumentRecord
    @Environment(AppSession.self) private var session

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(record.number).font(.headline)
                Spacer()
                StatusPill(status: record.status)
            }
            HStack {
                if let customer = record.customer {
                    Text(customer.name).font(.subheadline)
                }
                Spacer()
                if let total = record.total {
                    Text(total.value, format: .currency(code: session.tenant?.currency ?? "USD"))
                        .font(.subheadline.weight(.semibold))
                }
            }
            Text(record.date, style: .date).font(.caption).foregroundStyle(.tertiary)
        }
    }
}

struct StatusPill: View {
    let status: DocumentStatus
    var body: some View {
        // NOTE: `LocalizedStringKey("status.\(x)")` uses string-interpolation
        // initializer which builds a key with a `%@` placeholder, NOT the
        // literal "status.posted" key the catalog stores. Use the static-key
        // helper so SwiftUI looks each value up as authored.
        Text(localizedStatusKey(for: status))
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 8).padding(.vertical, 2)
            .background(color.opacity(0.15)).foregroundStyle(color)
            .clipShape(Capsule())
    }

    private var color: Color {
        switch status {
        case .posted: .green
        case .draft: .gray
        case .saved: .blue
        case .cancelled: .red
        }
    }
}
