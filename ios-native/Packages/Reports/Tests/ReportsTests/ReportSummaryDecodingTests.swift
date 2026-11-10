import XCTest
@testable import Reports

final class ReportSummaryDecodingTests: XCTestCase {
    func test_decodesServerPayload() throws {
        let json = #"""
        {
          "type": "ar-aging",
          "period": { "from": "2026-05-01", "to": "2026-05-11", "label": "this-month" },
          "currency": "USD",
          "hero": { "value": 492715.4, "deltaPct": null, "deltaSign": "flat" },
          "breakdown": [
            { "id": "u-1", "label": "Ulugbek Trading", "value": 433401.0, "meta": { "bucket": "31-60" } },
            { "id": "u-2", "label": "Test Customer", "value": 59314.4, "meta": { "bucket": "0-30" } }
          ]
        }
        """#.data(using: .utf8)!
        let s = try JSONDecoder().decode(ReportSummary.self, from: json)
        XCTAssertEqual(s.type, .arAging)
        XCTAssertEqual(s.currency, "USD")
        XCTAssertEqual(s.hero.value, 492715.4, accuracy: 0.01)
        XCTAssertNil(s.hero.deltaPct)
        XCTAssertEqual(s.hero.deltaSign, .flat)
        XCTAssertEqual(s.breakdown.count, 2)
        XCTAssertEqual(s.breakdown[0].meta?.bucket, .b31to60)
    }
}
