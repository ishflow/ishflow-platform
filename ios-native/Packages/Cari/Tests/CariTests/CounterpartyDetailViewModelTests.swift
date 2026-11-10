import APIClient
import AppShared
@testable import Cari
import Foundation
import XCTest

@MainActor
final class CounterpartyDetailViewModelTests: XCTestCase {
    // MARK: - Customer mode

    func testCustomerModeFetchesSalesInvoiceAndFiltersByCustomerId() async {
        let counterpartyId = UUID()
        let counterparty = Self.makeCounterparty(id: counterpartyId, type: .customer)

        // 6 sales invoices: 3 belong to this customer, 3 belong to others.
        let mineA = Self.makeSalesRecord(customerId: counterpartyId, daysAgo: 1)
        let otherA = Self.makeSalesRecord(customerId: UUID(), daysAgo: 2)
        let mineB = Self.makeSalesRecord(customerId: counterpartyId, daysAgo: 3)
        let otherB = Self.makeSalesRecord(customerId: UUID(), daysAgo: 4)
        let mineC = Self.makeSalesRecord(customerId: counterpartyId, daysAgo: 5)
        let otherC = Self.makeSalesRecord(customerId: UUID(), daysAgo: 6)
        let mock = MockAPIClient(records: [mineA, otherA, mineB, otherB, mineC, otherC])
        let viewModel = CounterpartyDetailViewModel(
            api: mock,
            counterparty: counterparty,
            type: .customer
        )

        await viewModel.load()

        guard case let .loaded(loaded) = viewModel.state else {
            XCTFail("expected .loaded, got \(viewModel.state)")
            return
        }
        XCTAssertEqual(loaded.count, 3)
        XCTAssertEqual(loaded.map(\.id), [mineA.id, mineB.id, mineC.id])
        let lastPath = await mock.lastPath
        XCTAssertEqual(lastPath, "/api/mobile/documents/sales.invoice")
    }

    // MARK: - Supplier mode

    func testSupplierModeFetchesPurchaseInvoiceAndFiltersBySupplierId() async {
        let counterpartyId = UUID()
        let counterparty = Self.makeCounterparty(id: counterpartyId, type: .supplier)

        let mineA = Self.makePurchaseRecord(supplierId: counterpartyId, daysAgo: 1)
        let otherA = Self.makePurchaseRecord(supplierId: UUID(), daysAgo: 2)
        let mineB = Self.makePurchaseRecord(supplierId: counterpartyId, daysAgo: 3)
        let otherB = Self.makePurchaseRecord(supplierId: UUID(), daysAgo: 4)
        let mock = MockAPIClient(records: [mineA, otherA, mineB, otherB])
        let viewModel = CounterpartyDetailViewModel(
            api: mock,
            counterparty: counterparty,
            type: .supplier
        )

        await viewModel.load()

        guard case let .loaded(loaded) = viewModel.state else {
            XCTFail("expected .loaded, got \(viewModel.state)")
            return
        }
        XCTAssertEqual(loaded.count, 2)
        XCTAssertEqual(loaded.map(\.id), [mineA.id, mineB.id])
        let lastPath = await mock.lastPath
        XCTAssertEqual(lastPath, "/api/mobile/documents/purchases.invoice")
    }

    // MARK: - Top 5 cap

    func testLoadTakesTopFiveSortedDateDescending() async {
        let counterpartyId = UUID()
        let counterparty = Self.makeCounterparty(id: counterpartyId, type: .customer)

        // 10 matching records, daysAgo 0..9 (most recent first when sorted).
        let records = (0..<10).map { offset in
            Self.makeSalesRecord(customerId: counterpartyId, daysAgo: offset)
        }
        let mock = MockAPIClient(records: records)
        let viewModel = CounterpartyDetailViewModel(
            api: mock,
            counterparty: counterparty,
            type: .customer
        )

        await viewModel.load()

        guard case let .loaded(loaded) = viewModel.state else {
            XCTFail("expected .loaded, got \(viewModel.state)")
            return
        }
        XCTAssertEqual(loaded.count, 5)
        // Already in date-desc order — the first 5 records (daysAgo 0..4) win.
        XCTAssertEqual(loaded.map(\.id), Array(records.prefix(5)).map(\.id))
        for index in 0..<(loaded.count - 1) {
            XCTAssertGreaterThan(loaded[index].date, loaded[index + 1].date)
        }
    }

    // MARK: - Empty result

    func testLoadEmptyResultTransitionsToLoadedEmpty() async {
        let counterparty = Self.makeCounterparty(id: UUID(), type: .customer)
        let mock = MockAPIClient(records: [])
        let viewModel = CounterpartyDetailViewModel(
            api: mock,
            counterparty: counterparty,
            type: .customer
        )

        await viewModel.load()

        guard case let .loaded(loaded) = viewModel.state else {
            XCTFail("expected .loaded, got \(viewModel.state)")
            return
        }
        XCTAssertEqual(loaded, [])
    }

    // MARK: - Error path

    func testAPIErrorTransitionsToFailed() async {
        let counterparty = Self.makeCounterparty(id: UUID(), type: .customer)
        let mock = MockAPIClient(records: [])
        await mock.setAlwaysFails(true)
        let viewModel = CounterpartyDetailViewModel(
            api: mock,
            counterparty: counterparty,
            type: .customer
        )

        await viewModel.load()

        guard case .failed = viewModel.state else {
            XCTFail("expected .failed, got \(viewModel.state)")
            return
        }
    }

    // MARK: - Helpers

    private static func makeCounterparty(id: UUID, type: CounterpartyType) -> Counterparty {
        Counterparty(
            id: id,
            code: "CP-1",
            name: type == .customer ? "Acme" : "Globex",
            balance: DecimalString(Decimal(0)),
            balanceDirection: .zero,
            currency: "RUB"
        )
    }

    private static func makeSalesRecord(customerId: UUID, daysAgo: Int) -> DocumentRecord {
        let date = Date(timeIntervalSinceReferenceDate: 1_000_000_000)
            .addingTimeInterval(TimeInterval(-daysAgo * 86_400))
        return DocumentRecord(
            id: UUID(),
            number: "INV-\(daysAgo)",
            date: date,
            status: .posted,
            createdAt: date,
            updatedAt: date,
            customerId: customerId
        )
    }

    private static func makePurchaseRecord(supplierId: UUID, daysAgo: Int) -> DocumentRecord {
        let date = Date(timeIntervalSinceReferenceDate: 1_000_000_000)
            .addingTimeInterval(TimeInterval(-daysAgo * 86_400))
        return DocumentRecord(
            id: UUID(),
            number: "PURCH-\(daysAgo)",
            date: date,
            status: .posted,
            createdAt: date,
            updatedAt: date,
            supplierId: supplierId
        )
    }
}

/// Test double for `APIClient` that records the last `path` it saw and
/// returns a JSON-encoded `DocumentListResponse` decoded into the caller's
/// expected `R.Response`. `actor`-isolated to satisfy `Sendable`.
private actor MockAPIClient: APIClient {
    private(set) var lastPath: String?
    private var records: [DocumentRecord]
    private var alwaysFails = false

    init(records: [DocumentRecord]) {
        self.records = records
    }

    func setAlwaysFails(_ value: Bool) {
        alwaysFails = value
    }

    func send<R: APIRequest>(_ request: R) async throws -> R.Response {
        lastPath = request.path
        if alwaysFails {
            throw APIError.network(URLError(.notConnectedToInternet))
        }
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        // Encode each record individually (DocumentRecord is Encodable),
        // then assemble into the paginated envelope shape via
        // JSONSerialization. PaginatedResponse has no public memberwise
        // init outside its module, so we build the wrapper as JSON.
        let itemsData = try encoder.encode(records)
        let itemsAny = try JSONSerialization.jsonObject(with: itemsData)
        let payload: [String: Any] = [
            "items": itemsAny,
            "total": records.count,
            "page": 1,
            "pageSize": 50
        ]
        let data = try JSONSerialization.data(withJSONObject: payload)
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(R.Response.self, from: data)
    }
}
