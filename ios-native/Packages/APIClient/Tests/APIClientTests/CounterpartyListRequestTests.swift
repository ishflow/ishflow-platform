@testable import APIClient
import AppShared
import XCTest

final class CounterpartyListRequestTests: XCTestCase {
    func testBuildsExpectedPathMethodAndFullQueryDict() {
        let request = CounterpartyListRequest(
            type: .customer,
            page: 2,
            pageSize: 25,
            q: "acme"
        )

        XCTAssertEqual(request.path, "/api/mobile/counterparties")
        XCTAssertEqual(request.method, .get)

        let query = request.query
        XCTAssertNotNil(query)
        XCTAssertEqual(query?["type"], "customer")
        XCTAssertEqual(query?["page"], "2")
        XCTAssertEqual(query?["pageSize"], "25")
        XCTAssertEqual(query?["q"], "acme")
    }

    func testNilQueryStringOmitsQKey() {
        let request = CounterpartyListRequest(type: .customer, q: nil)

        let query = request.query
        XCTAssertNotNil(query)
        XCTAssertNil(query?["q"])
        XCTAssertFalse(query?.keys.contains("q") ?? false)
    }

    func testEmptyQueryStringOmitsQKey() {
        let request = CounterpartyListRequest(type: .customer, q: "")

        let query = request.query
        XCTAssertNotNil(query)
        XCTAssertNil(query?["q"])
        XCTAssertFalse(query?.keys.contains("q") ?? false)
    }

    func testSupplierTypeStringifiesAsSupplier() {
        let request = CounterpartyListRequest(type: .supplier)

        XCTAssertEqual(request.query?["type"], "supplier")
    }

    func testDefaultsArePageOnePageSizeFiftyAndNoQuery() {
        let request = CounterpartyListRequest(type: .customer)

        XCTAssertEqual(request.page, 1)
        XCTAssertEqual(request.pageSize, 50)
        XCTAssertNil(request.q)
        XCTAssertEqual(request.query?["page"], "1")
        XCTAssertEqual(request.query?["pageSize"], "50")
    }
}
