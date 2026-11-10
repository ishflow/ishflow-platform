import APIClient
import AppShared
import Foundation
import Observation

/// View model backing `CariView`. Loads paginated counterparties from
/// `/api/mobile/counterparties` for the currently selected `segment`
/// (customer or supplier) and exposes a search query that re-issues the
/// request on the next `load()`.
@Observable
@MainActor
public final class CariViewModel {
    /// Loading state for the counterparty list.
    public enum State {
        /// Initial state before the first load.
        case idle
        /// Request in flight.
        case loading
        /// Successfully loaded counterparties.
        case loaded([Counterparty])
        /// Request failed with a human-readable error message.
        case failed(String)
    }

    /// Which counterparty kind to fetch on the next `load()`.
    public var segment: CounterpartyType = .customer
    /// Free-text search query; empty means "no filter".
    public var query: String = ""
    /// Current loading state.
    public private(set) var state: State = .idle

    private let api: any APIClient
    /// Monotonic token assigned when a `load()` begins. Stale completions
    /// (older than this token) drop their results to avoid the
    /// segment-switch race where a slow customer-fetch overwrites a fast
    /// supplier-fetch fired moments later.
    private var loadToken: UInt64 = 0
    /// Snapshot of (segment, query) at the time we last successfully loaded.
    /// Used to distinguish a true context switch (segment/query changed →
    /// show skeleton) from an in-place reload (pull-to-refresh, post-wizard
    /// notification → keep current rows visible).
    private var lastLoadedKey: LoadKey?

    private struct LoadKey: Equatable {
        let segment: CounterpartyType
        let query: String
    }

    /// Create a view model bound to the given API client.
    public init(api: any APIClient) {
        self.api = api
    }

    /// Fetch the counterparty list using the current `segment` and `query`.
    public func load() async {
        loadToken &+= 1
        let token = loadToken
        let currentKey = LoadKey(segment: segment, query: query)
        // Treat as a reload only when state already holds rows for the same
        // segment+query — otherwise the caller is switching context and the
        // skeleton helps signal that the list is changing.
        let isReload: Bool = {
            if case .loaded = state, lastLoadedKey == currentKey { return true }
            return false
        }()
        if !isReload { state = .loading }
        let request = CounterpartyListRequest(
            type: segment,
            page: 1,
            pageSize: 50,
            q: query.isEmpty ? nil : query
        )
        do {
            let response = try await api.send(request)
            guard token == loadToken else { return }
            state = .loaded(response.items)
            lastLoadedKey = currentKey
            // Index top 50 customers in Spotlight
            if segment == .customer {
                for customer in response.items.prefix(50) {
                    SpotlightIndexer.indexCustomer(customer)
                }
            }
        } catch let error as APIError {
            guard token == loadToken else { return }
            if isReload { return }
            state = .failed(error.localizedDescription)
        } catch {
            guard token == loadToken else { return }
            if isReload { return }
            state = .failed(String(describing: error))
        }
    }
}
