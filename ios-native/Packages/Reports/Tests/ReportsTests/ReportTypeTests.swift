import XCTest
@testable import Reports

final class ReportTypeTests: XCTestCase {
    func test_allCases_haveStableServerIds() {
        XCTAssertEqual(ReportType.arAging.rawValue, "ar-aging")
        XCTAssertEqual(ReportType.apAging.rawValue, "ap-aging")
        XCTAssertEqual(ReportType.salesByCustomer.rawValue, "sales-by-customer")
        XCTAssertEqual(ReportType.salesByProduct.rawValue, "sales-by-product")
        XCTAssertEqual(ReportType.grossProfit.rawValue, "gross-profit")
        XCTAssertEqual(ReportType.allCases.count, 5)
    }
}
