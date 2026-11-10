import APIClient
import AppShared
@testable import Docs
import Foundation
import XCTest

@MainActor
final class DocsListViewModelTests: XCTestCase {
    // MARK: - Helpers

    /// Build a deterministic `DocumentRecord` for tests.
    private func makeRecord(
        id: UUID = UUID(),
        number: String,
        date: Date,
        total: DecimalString = "100.00"
    ) -> DocumentRecord {
        DocumentRecord(
            id: id,
            number: number,
            date: date,
            status: .posted,
            createdAt: date,
            updatedAt: date,
            customerId: nil,
            customer: nil,
            supplierId: nil,
            supplier: nil,
            warehouseId: nil,
            warehouse: nil,
            priceTypeId: nil,
            priceType: nil,
            comment: nil,
            total: total,
            lines: nil
        )
    }

    private func date(_ year: Int, _ month: Int, _ day: Int) -> Date {
        var comps = DateComponents()
        comps.year = year
        comps.month = month
        comps.day = day
        comps.timeZone = TimeZone(identifier: "UTC")
        return Calendar(identifier: .gregorian).date(from: comps)!
    }

    private func canned(
        sales: [DocumentRecord] = [],
        purchases: [DocumentRecord] = [],
        paymentReceived: [DocumentRecord] = [],
        paymentSent: [DocumentRecord] = []
    ) -> [DocumentKind: [DocumentRecord]] {
        [
            .salesInvoice: sales,
            .purchaseInvoice: purchases,
            .salesPaymentReceived: paymentReceived,
            .purchasePaymentSent: paymentSent
        ]
    }

    // MARK: - Tests

    func testFilterAllFetchesAllFourKindsInParallel() async {
        let mock = MockAPIClient()
        let s = makeRecord(number: "S-1", date: date(2026, 1, 4))
        let p = makeRecord(number: "P-1", date: date(2026, 1, 1))
        let pr = makeRecord(number: "PR-1", date: date(2026, 1, 3))
        let ps = makeRecord(number: "PS-1", date: date(2026, 1, 2))
        await mock.setRecords(
            canned(sales: [s], purchases: [p], paymentReceived: [pr], paymentSent: [ps])
        )
        let vm = DocsListViewModel(api: mock, tenantCurrency: { "RUB" })

        await vm.load()

        guard case let .loaded(rows) = vm.state else {
            XCTFail("expected .loaded, got \(vm.state)")
            return
        }
        XCTAssertEqual(rows.count, 4)
        // Sorted date-desc: S-1 (1/4), PR-1 (1/3), PS-1 (1/2), P-1 (1/1)
        XCTAssertEqual(rows.map(\.displayNumber), ["S-1", "PR-1", "PS-1", "P-1"])

        let observed = await mock.observedPaths
        XCTAssertEqual(Set(observed), [
            "/api/mobile/documents/sales.invoice",
            "/api/mobile/documents/purchases.invoice",
            "/api/mobile/documents/sales.payment_received",
            "/api/mobile/documents/purchases.payment_sent"
        ])
    }

    func testFilterSalesFansOutToInvoiceAndPaymentReceived() async {
        let mock = MockAPIClient()
        let s = makeRecord(number: "S-1", date: date(2026, 1, 2))
        let pr = makeRecord(number: "PR-1", date: date(2026, 1, 1))
        await mock.setRecords(canned(sales: [s], paymentReceived: [pr]))
        let vm = DocsListViewModel(api: mock, tenantCurrency: { "RUB" })
        vm.filter = .sales

        await vm.load()

        guard case let .loaded(rows) = vm.state else {
            XCTFail("expected .loaded, got \(vm.state)")
            return
        }
        XCTAssertEqual(rows.map(\.displayNumber), ["S-1", "PR-1"])
        let observed = await mock.observedPaths
        XCTAssertEqual(Set(observed), [
            "/api/mobile/documents/sales.invoice",
            "/api/mobile/documents/sales.payment_received"
        ])
    }

    func testFilterPurchasesFansOutToInvoiceAndPaymentSent() async {
        let mock = MockAPIClient()
        let p = makeRecord(number: "P-1", date: date(2026, 1, 2))
        let ps = makeRecord(number: "PS-1", date: date(2026, 1, 1))
        await mock.setRecords(canned(purchases: [p], paymentSent: [ps]))
        let vm = DocsListViewModel(api: mock, tenantCurrency: { "RUB" })
        vm.filter = .purchases

        await vm.load()

        guard case let .loaded(rows) = vm.state else {
            XCTFail("expected .loaded, got \(vm.state)")
            return
        }
        XCTAssertEqual(rows.map(\.displayNumber), ["P-1", "PS-1"])
        let observed = await mock.observedPaths
        XCTAssertEqual(Set(observed), [
            "/api/mobile/documents/purchases.invoice",
            "/api/mobile/documents/purchases.payment_sent"
        ])
    }

    func testEmptyResultsAcrossAllKindsYieldsLoadedEmptyNotFailed() async {
        let mock = MockAPIClient()
        await mock.setRecords(canned())
        let vm = DocsListViewModel(api: mock, tenantCurrency: { "RUB" })

        await vm.load()

        guard case let .loaded(rows) = vm.state else {
            XCTFail("expected .loaded([]), got \(vm.state)")
            return
        }
        XCTAssertTrue(rows.isEmpty)
    }

    func testPartialFailureKeepsSucceedingKindsAsLoaded() async {
        let mock = MockAPIClient()
        let s = makeRecord(number: "S-1", date: date(2026, 1, 4))
        let pr = makeRecord(number: "PR-1", date: date(2026, 1, 3))
        let ps = makeRecord(number: "PS-1", date: date(2026, 1, 2))
        await mock.setRecords(
            canned(sales: [s], purchases: [], paymentReceived: [pr], paymentSent: [ps])
        )
        // Force purchases.invoice to fail, the other 3 succeed.
        await mock.setFailingKinds([.purchaseInvoice])
        let vm = DocsListViewModel(api: mock, tenantCurrency: { "RUB" })

        await vm.load()

        guard case let .loaded(rows) = vm.state else {
            XCTFail("expected .loaded with surviving rows, got \(vm.state)")
            return
        }
        XCTAssertEqual(rows.count, 3)
        XCTAssertEqual(rows.map(\.displayNumber), ["S-1", "PR-1", "PS-1"])
    }

    func testAllKindsFailingYieldsFailed() async {
        let mock = MockAPIClient()
        await mock.setRecords(canned())
        await mock.setFailingKinds(Set(DocumentKind.allCases))
        let vm = DocsListViewModel(api: mock, tenantCurrency: { "RUB" })

        await vm.load()

        guard case .failed = vm.state else {
            XCTFail("expected .failed, got \(vm.state)")
            return
        }
    }

    func testPullToRefreshReRunsRequests() async {
        let mock = MockAPIClient()
        await mock.setRecords(canned(sales: [makeRecord(number: "S-1", date: date(2026, 1, 1))]))
        let vm = DocsListViewModel(api: mock, tenantCurrency: { "RUB" })
        vm.filter = .sales

        await vm.load()
        await vm.load()

        let observed = await mock.observedPaths
        XCTAssertEqual(observed.count, 2)
        XCTAssertEqual(observed, [
            "/api/mobile/documents/sales.invoice",
            "/api/mobile/documents/sales.invoice"
        ])
    }

    func testAdvancedFiltersAppearInQueryString() async {
        let mock = MockAPIClient()
        await mock.setRecords(canned(sales: [makeRecord(number: "S-1", date: date(2026, 1, 1))]))
        let vm = DocsListViewModel(api: mock, tenantCurrency: { "RUB" })
        vm.filter = .sales
        var f = AdvancedFilters()
        f.dateFrom = date(2026, 1, 1)
        f.dateTo = date(2026, 1, 31)
        f.customerIds = ["c1", "c2"]
        f.productIds = ["p1"]
        vm.advancedFilters = f

        await vm.load()

        let observed = await mock.observedQueries
        let salesQuery = observed["/api/mobile/documents/sales.invoice"] ?? [:]
        XCTAssertEqual(salesQuery["from"], "2026-01-01")
        XCTAssertEqual(salesQuery["to"], "2026-01-31")
        // Sets serialize sorted to keep deterministic output.
        XCTAssertEqual(salesQuery["customerIds"], "c1,c2")
        XCTAssertEqual(salesQuery["productIds"], "p1")
        XCTAssertNil(salesQuery["supplierIds"]) // empty = absent
    }
}

// MARK: - Mock

/// Test double for `APIClient` that dispatches on `request.path` to a
/// per-`DocumentKind` queue of canned `DocumentRecord` values. Returns a
/// JSON-encoded `DocumentListResponse` decoded back into the caller's
/// expected `R.Response`. `actor`-isolated so concurrent `send` calls from
/// `withTaskGroup` serialize and the protocol's `Sendable` requirement is
/// met without `@unchecked Sendable`.
private actor MockAPIClient: APIClient {
    private(set) var observedPaths: [String] = []
    private(set) var observedQueries: [String: [String: String]] = [:]
    private var records: [DocumentKind: [DocumentRecord]] = [:]
    private var failingKinds: Set<DocumentKind> = []

    func setRecords(_ records: [DocumentKind: [DocumentRecord]]) {
        self.records = records
    }

    func setFailingKinds(_ kinds: Set<DocumentKind>) {
        failingKinds = kinds
    }

    func send<R: APIRequest>(_ request: R) async throws -> R.Response {
        observedPaths.append(request.path)
        observedQueries[request.path] = request.query ?? [:]
        guard let kind = Self.kind(forPath: request.path) else {
            throw APIError.network(URLError(.unsupportedURL))
        }
        if failingKinds.contains(kind) {
            throw APIError.network(URLError(.notConnectedToInternet))
        }
        let items = records[kind] ?? []
        let payload: [String: Any] = [
            "items": items.map(Self.encodeRecord),
            "total": items.count,
            "page": 1,
            "pageSize": 50
        ]
        let data = try JSONSerialization.data(withJSONObject: payload)
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(R.Response.self, from: data)
    }

    private static func kind(forPath path: String) -> DocumentKind? {
        for kind in DocumentKind.allCases
            where path == "/api/mobile/documents/\(kind.rawValue)" {
            return kind
        }
        return nil
    }

    private static func iso(_ date: Date) -> String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f.string(from: date)
    }

    private static func encodeRecord(_ record: DocumentRecord) -> [String: Any] {
        var payload: [String: Any] = [
            "id": record.id.uuidString,
            "number": record.number,
            "date": iso(record.date),
            "status": record.status.rawValue,
            "createdAt": iso(record.createdAt),
            "updatedAt": iso(record.updatedAt)
        ]
        if let total = record.total {
            payload["total"] = total.value.description
        }
        return payload
    }
}
