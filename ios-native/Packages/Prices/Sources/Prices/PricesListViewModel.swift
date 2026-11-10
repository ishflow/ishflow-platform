import APIClient
import AppShared
import Foundation
import Observation

/// View model backing `PricesListView`. Loads catalog records from
/// `/api/mobile/catalogs/sales.price_type` and exposes a search query that
/// filters client-side.
@Observable
@MainActor
public final class PricesListViewModel {
    /// Loading state for the prices list.
    public enum State {
        /// Initial state before the first load.
        case idle
        /// Request in flight.
        case loading
        /// Successfully loaded price-list records.
        case loaded([CatalogRecord])
        /// Request failed with a human-readable message.
        case failed(String)
    }

    /// Current loading state.
    public var state: State = .idle
    /// Current search text for client-side filtering.
    public var searchText: String = ""

    private let api: any APIClient

    /// Rows after applying client-side search.
    public var filteredItems: [CatalogRecord] {
        guard case let .loaded(items) = state else { return [] }
        guard !searchText.isEmpty else { return items }
        let q = searchText.lowercased()
        return items.filter {
            $0.name.lowercased().contains(q) ||
            ($0.code?.lowercased().contains(q) ?? false)
        }
    }

    /// Create a list view model bound to the given API client.
    public init(api: any APIClient) {
        self.api = api
    }

    /// Fetch the price-list catalog. Re-runs whenever called. On reloads
    /// the previously loaded rows stay visible so pull-to-refresh stays
    /// smooth and a transient connection blip doesn't wipe the screen.
    public func load() async {
        let isReload: Bool
        if case .loaded = state { isReload = true } else { isReload = false }
        if !isReload { state = .loading }
        do {
            // swiftlint:disable nesting
            struct Req: APIRequest {
                typealias Response = CatalogListResponse
                let path = "/api/mobile/catalogs/sales.price_type"
                let method: HTTPMethod = .get
            }
            // swiftlint:enable nesting
            let resp = try await api.send(Req())
            state = .loaded(resp.items)
        } catch let error as APIError {
            if isReload { return }
            state = .failed(error.localizedDescription)
        } catch {
            if isReload { return }
            state = .failed("error.unknown")
        }
    }
}
