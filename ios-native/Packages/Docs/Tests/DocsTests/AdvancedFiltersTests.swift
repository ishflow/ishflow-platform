@testable import Docs
import Foundation
import XCTest

final class AdvancedFiltersTests: XCTestCase {
    func testEmptyByDefault() {
        let f = AdvancedFilters()
        XCTAssertTrue(f.isEmpty)
        XCTAssertEqual(f.activeCount, 0)
    }

    func testDateRangeCountsAsOneActiveDimension() {
        var f = AdvancedFilters()
        f.dateFrom = Date()
        XCTAssertEqual(f.activeCount, 1)
        f.dateTo = Date().addingTimeInterval(86_400)
        XCTAssertEqual(f.activeCount, 1, "dateFrom + dateTo together still = 1 active dimension")
    }

    func testEachDimensionAddsToActiveCount() {
        var f = AdvancedFilters()
        f.customerIds = ["a"]
        f.supplierIds = ["b"]
        f.productIds = ["c"]
        XCTAssertEqual(f.activeCount, 3)
        XCTAssertFalse(f.isEmpty)
    }

    func testResetReturnsEmpty() {
        var f = AdvancedFilters()
        f.customerIds = ["a"]
        f.dateFrom = Date()
        f = AdvancedFilters()
        XCTAssertTrue(f.isEmpty)
    }
}
