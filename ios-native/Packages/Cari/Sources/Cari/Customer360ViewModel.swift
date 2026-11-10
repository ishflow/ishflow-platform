import APIClient
import AppShared
import Foundation
import Observation

/// View model backing `Customer360View`. Fetches the aggregated
/// counterparty-360 payload (customer or supplier) and exposes loading,
/// error, and refresh states.
@Observable
@MainActor
public final class Customer360ViewModel {
    /// Loading state for the counterparty 360 screen.
    public enum State {
        /// Initial state before the first load.
        case idle
        /// Request in flight.
        case loading
        /// Successfully loaded counterparty 360 data.
        case loaded(Customer360Response)
        /// Request failed with a human-readable error message.
        case failed(String)
    }

    /// Counterparty identifier.
    public let customerId: String
    /// Counterparty name (used for the navigation title while loading).
    public let customerName: String
    /// Counterparty kind — drives endpoint query param + UI labels.
    public let type: CounterpartyType
    /// Current loading state.
    public private(set) var state: State = .idle

    private let api: any APIClient
    private var loadToken: UInt64 = 0

    /// Create a view model bound to the given API client and counterparty.
    public init(
        api: any APIClient,
        customerId: String,
        customerName: String,
        type: CounterpartyType = .customer
    ) {
        self.api = api
        self.customerId = customerId
        self.customerName = customerName
        self.type = type
    }

    /// Fetch the aggregated counterparty 360 payload. On reloads keep the
    /// previously loaded payload visible so pull-to-refresh stays smooth
    /// and a transient connection blip doesn't wipe the screen.
    public func load() async {
        loadToken &+= 1
        let token = loadToken
        let isReload: Bool
        if case .loaded = state { isReload = true } else { isReload = false }
        if !isReload { state = .loading }

        struct Req: APIRequest {
            typealias Response = Customer360Response
            let path: String
            let method: HTTPMethod = .get
            let query: [String: String]?
        }

        let path = "/api/mobile/counterparty-360/\(customerId)"
        let query = ["type": type.rawValue]

        do {
            let response = try await api.send(Req(path: path, query: query))
            guard token == loadToken else { return }
            state = .loaded(response)
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

    /// Refresh action for `.refreshable`.
    public func refresh() async {
        await load()
    }
}
