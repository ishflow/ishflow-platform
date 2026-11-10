import APIClient
import AppShared
import Foundation
import Observation

/// View model backing `SalesListView`. Loads paginated sales-invoice
/// documents from `/api/mobile/documents/sales.invoice` and exposes a
/// search query that re-issues the request on change.
@Observable
@MainActor
public final class SalesListViewModel {
    /// Loading state for the sales list.
    public enum State {
        /// Initial state before the first load.
        case idle
        /// Request in flight.
        case loading
        /// Successfully loaded documents.
        case loaded([DocumentRecord])
        /// Request failed with a human-readable message.
        case failed(String)
    }

    /// Current loading state.
    public var state: State = .idle
    /// Current search query; re-loads when bound view updates it.
    public var query: String = ""

    private let api: any APIClient

    /// Create a list view model bound to the given API client.
    public init(api: any APIClient) {
        self.api = api
    }

    /// Fetch the sales invoice list. Re-runs whenever called.
    /// On reloads the previously loaded rows stay visible so a body swap
    /// to the skeleton doesn't detach `.refreshable` from its List and
    /// surface in-flight cancellations as a spurious "no connection".
    public func load() async {
        let isReload: Bool
        if case .loaded = state { isReload = true } else { isReload = false }
        if !isReload { state = .loading }
        do {
            // swiftlint:disable nesting
            struct Req: APIRequest {
                typealias Response = DocumentListResponse
                let path = "/api/mobile/documents/sales.invoice"
                let method: HTTPMethod = .get
                let query: [String: String]?
            }
            // swiftlint:enable nesting
            let queryDict: [String: String] = query.isEmpty ? [:] : ["q": query]
            let resp = try await api.send(Req(query: queryDict))
            state = .loaded(resp.items)
            // Index top 50 invoices in Spotlight
            for invoice in resp.items.prefix(50) {
                SpotlightIndexer.indexInvoice(invoice)
            }
        } catch let error as APIError {
            if isReload { return }
            state = .failed(error.localizedDescription)
        } catch {
            if isReload { return }
            state = .failed("error.unknown")
        }
    }
}
