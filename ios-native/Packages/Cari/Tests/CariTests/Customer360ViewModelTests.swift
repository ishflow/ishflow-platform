import APIClient
import AppShared
@testable import Cari
import Foundation
import XCTest

@MainActor
final class Customer360ViewModelTests: XCTestCase {
    func testInitialState() {
        let mock = MockAPIClient()
        let viewModel = Customer360ViewModel(api: mock, customerId: "c1", customerName: "Acme")

        XCTAssertEqual(viewModel.customerId, "c1")
        XCTAssertEqual(viewModel.customerName, "Acme")
        XCTAssertEqual(viewModel.type, .customer)
        guard case .idle = viewModel.state else {
            XCTFail("expected initial state to be .idle, got \(viewModel.state)")
            return
        }
    }

    func testSuccessfulCustomerLoad() async {
        let mock = MockAPIClient()
        await mock.queueResponse(type: "customer", name: "Acme Corp")
        let viewModel = Customer360ViewModel(api: mock, customerId: "c1", customerName: "Acme", type: .customer)

        await viewModel.load()

        guard case let .loaded(loaded) = viewModel.state else {
            XCTFail("expected .loaded, got \(viewModel.state)")
            return
        }
        XCTAssertEqual(loaded.type, .customer)
        XCTAssertEqual(loaded.counterparty.id, "c1")
        XCTAssertEqual(loaded.counterparty.name, "Acme Corp")
        XCTAssertEqual(loaded.balance, 800)
        XCTAssertEqual(loaded.currency, "USD")
        XCTAssertEqual(loaded.invoices.count, 1)
        XCTAssertEqual(loaded.payments.count, 1)

        let lastPath = await mock.lastPath
        XCTAssertEqual(lastPath, "/api/mobile/counterparty-360/c1?type=customer")
    }

    func testSuccessfulSupplierLoadHitsSupplierEndpoint() async {
        let mock = MockAPIClient()
        await mock.queueResponse(type: "supplier", name: "WidgetCo")
        let viewModel = Customer360ViewModel(api: mock, customerId: "s1", customerName: "WidgetCo", type: .supplier)

        await viewModel.load()

        guard case let .loaded(loaded) = viewModel.state else {
            XCTFail("expected .loaded, got \(viewModel.state)")
            return
        }
        XCTAssertEqual(loaded.type, .supplier)
        XCTAssertEqual(loaded.counterparty.name, "WidgetCo")

        let lastPath = await mock.lastPath
        XCTAssertEqual(lastPath, "/api/mobile/counterparty-360/s1?type=supplier")
    }

    func testAPIErrorTransitionsToFailed() async {
        let mock = MockAPIClient()
        await mock.setAlwaysFails(true)
        let viewModel = Customer360ViewModel(api: mock, customerId: "c1", customerName: "Acme")

        await viewModel.load()

        guard case .failed = viewModel.state else {
            XCTFail("expected .failed, got \(viewModel.state)")
            return
        }
    }

    func testRefreshReusesSamePath() async {
        let mock = MockAPIClient()
        await mock.queueResponse(type: "customer", name: "Acme Corp")
        let viewModel = Customer360ViewModel(api: mock, customerId: "c1", customerName: "Acme")

        await viewModel.refresh()

        guard case let .loaded(loaded) = viewModel.state else {
            XCTFail("expected .loaded, got \(viewModel.state)")
            return
        }
        XCTAssertEqual(loaded.counterparty.name, "Acme Corp")
    }
}

private actor MockAPIClient: APIClient {
    private(set) var lastPath: String?
    private var alwaysFails = false
    private var responseType: String = "customer"
    private var responseName: String = "Acme Corp"

    func setAlwaysFails(_ value: Bool) {
        alwaysFails = value
    }

    func queueResponse(type: String, name: String) {
        responseType = type
        responseName = name
    }

    func send<R: APIRequest>(_ request: R) async throws -> R.Response {
        lastPath = request.path
        if alwaysFails {
            throw APIError.network(URLError(.notConnectedToInternet))
        }
        let payload: [String: Any] = [
            "type": responseType,
            "counterparty": [
                "id": responseType == "supplier" ? "s1" : "c1",
                "code": responseType == "supplier" ? NSNull() : "C-001",
                "name": responseName,
                "phone": "+1-555-0100",
                "email": "acme@example.com",
                "address": responseType == "supplier" ? NSNull() : "123 Main St"
            ],
            "balance": 800,
            "currency": "USD",
            "balanceTrend": [
                ["weekStart": "2026-01-05", "balance": 0],
                ["weekStart": "2026-01-12", "balance": 200],
                ["weekStart": "2026-01-19", "balance": 500]
            ],
            "invoices": [
                [
                    "id": "inv1",
                    "number": "INV-001",
                    "date": "2026-04-20T00:00:00Z",
                    "status": "POSTED",
                    "postedAt": "2026-04-20T00:00:00Z",
                    "total": 500
                ]
            ],
            "payments": [
                [
                    "id": "pay1",
                    "number": "PAY-001",
                    "date": "2026-04-21T00:00:00Z",
                    "amount": 200,
                    "status": "POSTED",
                    "postedAt": "2026-04-21T00:00:00Z"
                ]
            ],
            "stockOuts": []
        ]
        let data = try JSONSerialization.data(withJSONObject: payload)
        return try JSONDecoder().decode(R.Response.self, from: data)
    }
}
