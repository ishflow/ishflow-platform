import APIClient
import AppShared
import Foundation
import Observation

/// View model backing `CounterpartyDetailView`. Loads the most recent
/// documents for a single counterparty by fetching the relevant list
/// endpoint (`sales.invoice` for customers, `purchases.invoke` for
/// suppliers), filtering client-side by `customerId` / `supplierId`,
/// then keeping the top 5 sorted by `date` descending.
///
/// Faz 2 ships a client-side filter because the mobile list endpoint does
/// not yet accept a counterparty filter — `DocumentListQuerySchema` only
/// honours `q`, `page`, `pageSize`, `status`, `from`, `to`. A page size of
/// 50 is enough headroom for demo data; a counterparty whose docs all
/// fall outside the latest 50 will see an empty list, which is the same
/// terminal state as having no documents. Faz 3 adds a server-side filter.
@Observable
@MainActor
public final class CounterpartyDetailViewModel {
    /// Loading state for the recent-documents list.
    public enum State {
        /// Initial state before the first load.
        case idle
        /// Request in flight.
        case loading
        /// Successfully loaded a (possibly empty) list of recent docs.
        case loaded([DocumentRecord])
        /// Request failed with a human-readable error message.
        case failed(String)
    }

    /// The counterparty whose documents we render.
    public let counterparty: Counterparty
    /// Whether to look up sales or purchase documents for this counterparty.
    public let type: CounterpartyType
    /// Current loading state.
    public private(set) var state: State = .idle

    private let api: any APIClient
    /// Monotonic token assigned when a `load()` begins. Stale completions
    /// drop their results to avoid races (e.g. fast retry overwriting an
    /// in-flight slow load).
    private var loadToken: UInt64 = 0

    /// Create a detail view model bound to the given API client.
    public init(api: any APIClient, counterparty: Counterparty, type: CounterpartyType) {
        self.api = api
        self.counterparty = counterparty
        self.type = type
    }

    /// Fetch the latest documents and reduce to the top 5 for this counterparty.
    public func load() async {
        loadToken &+= 1
        let token = loadToken
        state = .loading

        let counterpartyId = counterparty.id
        let mode = type
        let path: String
        switch mode {
        case .customer:
            path = "/api/mobile/documents/sales.invoice"
        case .supplier:
            path = "/api/mobile/documents/purchases.invoice"
        }

        // swiftlint:disable nesting
        struct Req: APIRequest {
            typealias Response = DocumentListResponse
            let path: String
            let method: HTTPMethod = .get
            let query: [String: String]?
        }
        // swiftlint:enable nesting

        do {
            let response = try await api.send(Req(path: path, query: ["pageSize": "50"]))
            guard token == loadToken else { return }
            let filtered = response.items.filter { record in
                switch mode {
                case .customer:
                    return record.customerId == counterpartyId
                case .supplier:
                    return record.supplierId == counterpartyId
                }
            }
            let sorted = filtered.sorted { $0.date > $1.date }
            state = .loaded(Array(sorted.prefix(5)))
        } catch let error as APIError {
            guard token == loadToken else { return }
            state = .failed(error.localizedDescription)
        } catch {
            guard token == loadToken else { return }
            state = .failed(String(describing: error))
        }
    }
}
