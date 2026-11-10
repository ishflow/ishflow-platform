import APIClient
import AppShared
@testable import Cari
import Foundation
import XCTest

@MainActor
final class CariViewModelTests: XCTestCase {
    func testInitialState() {
        let mock = MockAPIClient()
        let viewModel = CariViewModel(api: mock)

        XCTAssertEqual(viewModel.segment, .customer)
        XCTAssertEqual(viewModel.query, "")
        guard case .idle = viewModel.state else {
            XCTFail("expected initial state to be .idle, got \(viewModel.state)")
            return
        }
    }

    func testSuccessfulLoad() async {
        let mock = MockAPIClient()
        let names = ["Far Out LLC", "Acme Corp"]
        await mock.queue(names: names)
        let viewModel = CariViewModel(api: mock)

        await viewModel.load()

        guard case let .loaded(loaded) = viewModel.state else {
            XCTFail("expected .loaded, got \(viewModel.state)")
            return
        }
        XCTAssertEqual(loaded.map(\.name), names)

        let lastQuery = await mock.lastQuery
        XCTAssertEqual(lastQuery?["type"], CounterpartyType.customer.rawValue)
        XCTAssertEqual(lastQuery?["page"], "1")
        XCTAssertEqual(lastQuery?["pageSize"], "50")
        XCTAssertNil(lastQuery?["q"])
    }

    func testSegmentSwitchTriggersDifferentRequest() async {
        let mock = MockAPIClient()
        await mock.queue(names: ["Supplier A"])
        let viewModel = CariViewModel(api: mock)
        viewModel.segment = .supplier

        await viewModel.load()

        let lastQuery = await mock.lastQuery
        XCTAssertEqual(lastQuery?["type"], CounterpartyType.supplier.rawValue)
        guard case let .loaded(loaded) = viewModel.state else {
            XCTFail("expected .loaded, got \(viewModel.state)")
            return
        }
        XCTAssertEqual(loaded.map(\.name), ["Supplier A"])
    }

    func testAPIErrorTransitionsToFailed() async {
        let mock = MockAPIClient()
        await mock.setAlwaysFails(true)
        let viewModel = CariViewModel(api: mock)

        await viewModel.load()

        guard case .failed = viewModel.state else {
            XCTFail("expected .failed, got \(viewModel.state)")
            return
        }
    }

    func testSearchQueryPropagates() async {
        let mock = MockAPIClient()
        await mock.queue(names: [])
        let viewModel = CariViewModel(api: mock)
        viewModel.query = "Far"

        await viewModel.load()

        let lastQuery = await mock.lastQuery
        XCTAssertEqual(lastQuery?["q"], "Far")
    }
}

/// Test double for `APIClient` that records the last `query` dict it saw and
/// returns a JSON-encoded `CounterpartyListResponse` decoded back into the
/// caller's expected `R.Response` type. `actor`-isolated so concurrent `send`
/// calls serialize and the protocol's `Sendable` requirement is met without
/// `@unchecked Sendable`.
private actor MockAPIClient: APIClient {
    private(set) var lastQuery: [String: String]?
    private var queuedNames: [String] = []
    private var alwaysFails = false

    func queue(names: [String]) {
        queuedNames = names
    }

    func setAlwaysFails(_ value: Bool) {
        alwaysFails = value
    }

    func send<R: APIRequest>(_ request: R) async throws -> R.Response {
        lastQuery = request.query
        if alwaysFails {
            throw APIError.network(URLError(.notConnectedToInternet))
        }
        let items: [[String: Any]] = queuedNames.map { name in
            [
                "id": UUID().uuidString,
                "name": name,
                "balance": "0",
                "balanceDirection": BalanceDirection.zero.rawValue,
                "currency": "RUB"
            ]
        }
        let payload: [String: Any] = [
            "items": items,
            "total": items.count,
            "page": 1,
            "pageSize": 50
        ]
        let data = try JSONSerialization.data(withJSONObject: payload)
        return try JSONDecoder().decode(R.Response.self, from: data)
    }
}
