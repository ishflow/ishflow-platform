import XCTest
@testable import Reports

final class ReportPeriodTests: XCTestCase {
    func test_allCases_serverIds() {
        XCTAssertEqual(ReportPeriod.thisWeek.serverId, "this-week")
        XCTAssertEqual(ReportPeriod.thisMonth.serverId, "this-month")
        XCTAssertEqual(ReportPeriod.thisQuarter.serverId, "this-quarter")
        XCTAssertEqual(ReportPeriod.thisYear.serverId, "this-year")
        XCTAssertEqual(ReportPeriod.allCases.count, 4)
    }
}
