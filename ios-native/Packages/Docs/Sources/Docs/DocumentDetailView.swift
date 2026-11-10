import APIClient
import AppShared
import Core
import SwiftUI

/// Generic document detail screen used for any kind that doesn't have a
/// bespoke detail view (today: purchase invoice + both payment kinds).
/// Loading + error are owned here; rendering delegates to
/// `DocumentDetailContent` so the visual language matches `SalesDetailView`.
public struct DocumentDetailView: View {
    private let api: any APIClient
    private let summary: DocumentSummary
    @State private var viewModel: DocumentDetailViewModel?
    @Environment(AppSession.self) private var session

    public init(api: any APIClient, summary: DocumentSummary) {
        self.api = api
        self.summary = summary
    }

    public var body: some View {
        Group {
            switch viewModel?.state {
            case .none, .loading:
                loadingView
            case let .failed(msg):
                ContentUnavailableView(
                    "docs.detail.error.title",
                    systemImage: "exclamationmark.triangle",
                    description: Text(msg)
                )
            case let .loaded(doc):
                DocumentDetailContent(
                    doc: doc,
                    kind: summary.kind,
                    tenantCurrency: tenantCurrency,
                    extra: AnyView(
                        AttachmentSection(
                            entity: summary.kind.rawValue,
                            entityId: doc.id,
                            api: api
                        )
                    )
                )
            }
        }
        .navigationTitle(summary.displayNumber)
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            if case let .loaded(doc) = viewModel?.state, doc.status == .posted {
                ShareButton {
                    try DocumentReceiptPDFRenderer.makePDF(
                        for: doc,
                        kind: summary.kind,
                        tenantCurrency: tenantCurrency,
                        tenantName: session.tenant?.name
                    )
                }
            }
        }
        .task {
            if viewModel == nil {
                viewModel = DocumentDetailViewModel(api: api, kind: summary.kind, id: summary.id)
            }
            await viewModel?.load()
        }
    }

    @ViewBuilder
    private var loadingView: some View {
        Form {
            Section {
                VStack(spacing: 12) {
                    Circle().fill(Color.gray.opacity(0.2)).frame(width: 72, height: 72)
                    RoundedRectangle(cornerRadius: 4).fill(Color.gray.opacity(0.2)).frame(width: 160, height: 18)
                    RoundedRectangle(cornerRadius: 4).fill(Color.gray.opacity(0.2)).frame(width: 100, height: 12)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .listRowBackground(Color.clear)
            }
            ForEach(0 ..< 3, id: \.self) { _ in
                Section {
                    HStack {
                        RoundedRectangle(cornerRadius: 4).fill(Color.gray.opacity(0.2)).frame(width: 120, height: 14)
                        Spacer()
                        RoundedRectangle(cornerRadius: 4).fill(Color.gray.opacity(0.2)).frame(width: 60, height: 14)
                    }
                }
            }
        }
        .redacted(reason: .placeholder)
    }

    private var tenantCurrency: String {
        session.tenant?.currency ?? "USD"
    }
}
