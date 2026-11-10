import APIClient
import AppShared
import Foundation
import Observation

/// View model backing `SalesDetailView`. Loads a single sales-invoice
/// document by id from `/api/mobile/documents/sales.invoice/:id`.
@Observable
@MainActor
public final class SalesDetailViewModel {
    /// Loading state for the sales detail screen.
    public enum State {
        /// Request in flight.
        case loading
        /// Successfully loaded document.
        case loaded(DocumentRecord)
        /// Request failed with a human-readable message.
        case failed(String)
    }

    /// Current loading state.
    public var state: State = .loading
    private let api: any APIClient
    private let id: UUID

    /// Create a detail view model bound to the given API client and document id.
    public init(api: any APIClient, id: UUID) {
        self.api = api
        self.id = id
    }

    /// Fetch the sales invoice. Re-runs whenever called.
    public func load() async {
        state = .loading
        do {
            // swiftlint:disable nesting
            struct Req: APIRequest {
                typealias Response = DocumentRecord
                let path: String
                let method: HTTPMethod = .get
            }
            // swiftlint:enable nesting
            let resp = try await api.send(
                Req(path: "/api/mobile/documents/sales.invoice/\(id.uuidString)")
            )
            state = .loaded(resp)
        } catch {
            state = .failed(String(describing: error))
        }
    }
}
