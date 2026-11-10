import APIClient
import AppShared
import Core
import SwiftUI

/// Sales invoice detail screen. Renders read-only content via the shared
/// `DocumentDetailContent`, then layers on sales-specific extras: a Share
/// button (PDF download) for posted invoices and a "Continue wizard" CTA
/// for drafts.
public struct SalesDetailView: View {
    private let api: any APIClient
    private let id: UUID
    @State private var viewModel: SalesDetailViewModel?
    @State private var showWizard = false
    @Environment(AppSession.self) private var session
    @Environment(\.shareConfiguration) private var shareConfiguration

    public init(api: any APIClient, id: UUID) {
        self.api = api
        self.id = id
    }

    public var body: some View {
        Group {
            switch viewModel?.state {
            case .none, .loading:
                ProgressView()
            case let .failed(msg):
                ContentUnavailableView(
                    "sales.detail.error",
                    systemImage: "exclamationmark.triangle",
                    description: Text(msg)
                )
            case let .loaded(doc):
                content(doc)
            }
        }
        .navigationTitle("sales.detail.title")
        .toolbar {
            if case let .loaded(doc) = viewModel?.state, doc.status == .posted {
                ShareButton {
                    try DocumentReceiptPDFRenderer.makePDF(
                        for: doc,
                        kind: .salesInvoice,
                        tenantCurrency: tenantCurrency,
                        tenantName: session.tenant?.name
                    )
                }
            }
        }
        .task {
            if viewModel == nil { viewModel = SalesDetailViewModel(api: api, id: id) }
            await viewModel?.load()
        }
    }

    @ViewBuilder
    private func content(_ doc: DocumentRecord) -> some View {
        if doc.status == .posted {
            DocumentDetailContent(
                doc: doc,
                kind: .salesInvoice,
                tenantCurrency: tenantCurrency,
                extra: AnyView(
                    AttachmentSection(
                        entity: DocumentKind.salesInvoice.rawValue,
                        entityId: doc.id,
                        api: api
                    )
                )
            )
        } else {
            // Draft: same shared rendering plus a wizard-resume CTA below.
            // We can't add a Section to DocumentDetailContent's Form from
            // outside, so we wrap and stack a separate Form for the CTA.
            VStack(spacing: 0) {
                DocumentDetailContent(
                    doc: doc,
                    kind: .salesInvoice,
                    tenantCurrency: tenantCurrency,
                    extra: AnyView(
                        AttachmentSection(
                            entity: DocumentKind.salesInvoice.rawValue,
                            entityId: doc.id,
                            api: api
                        )
                    )
                )
                Button("sales.detail.continueWizard") {
                    showWizard = true
                }
                .buttonStyle(.borderedProminent)
                .padding()
            }
            .sheet(isPresented: $showWizard) {
                if case let .loaded(doc) = viewModel?.state {
                    SalesWizardView(
                        api: api,
                        initialModel: SalesWizardModel(restoring: doc)
                    )
                }
            }
        }
    }

    private var tenantCurrency: String {
        session.tenant?.currency ?? "USD"
    }
}
