import APIClient
import AppShared
import SwiftUI

/// Thin loader that fetches a saved sales-invoice draft and immediately
/// presents `SalesWizardView` pre-populated via `SalesWizardModel(restoring:)`.
///
/// Used by `DocsListView` to give the user a one-tap "resume editing"
/// experience for non-posted invoices, instead of routing through the
/// read-only `SalesDetailView` + a manual "Continue wizard" button.
public struct SalesDraftResumeView: View {
    private let api: any APIClient
    private let id: UUID
    @State private var state: LoadState = .loading

    enum LoadState {
        case loading
        case loaded(DocumentRecord)
        case failed(String)
    }

    public init(api: any APIClient, id: UUID) {
        self.api = api
        self.id = id
    }

    public var body: some View {
        Group {
            switch state {
            case .loading:
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color(.systemBackground))
            case let .loaded(doc):
                SalesWizardView(
                    api: api,
                    initialModel: SalesWizardModel(restoring: doc)
                )
            case let .failed(msg):
                ContentUnavailableView(
                    "sales.detail.error",
                    systemImage: "exclamationmark.triangle",
                    description: Text(msg)
                )
            }
        }
        .task { await load() }
    }

    private func load() async {
        // Same endpoint SalesDetailViewModel uses.
        struct Req: APIRequest {
            typealias Response = DocumentRecord
            let path: String
            let method: HTTPMethod = .get
        }
        do {
            let resp = try await api.send(
                Req(path: "/api/mobile/documents/sales.invoice/\(id.uuidString)")
            )
            state = .loaded(resp)
        } catch {
            state = .failed(String(describing: error))
        }
    }
}
