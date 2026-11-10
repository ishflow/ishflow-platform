@testable import AppShared
import XCTest

final class DashboardModelTests: XCTestCase {
    // Use the canonical decoder so changes to JSONDecoder.ishflow are
    // caught by tests rather than silently passing with a local copy.
    private let decoder = JSONDecoder.ishflow

    func testDecodesFullPayload() throws {
        let json = Data(#"""
        {
          "tenant": { "id": "t1", "currency": "USD" },
          "kpis": {
            "receivable":     { "value": "1000.50", "delta": 25.0 },
            "payable":        { "value": "500",     "delta": -16.67 },
            "thisMonthSales": { "value": "3000",    "delta": 20.0 },
            "openInvoices":   { "value": 7,         "delta": 40.0 }
          },
          "upcomingReceivables": [
            { "id": "c1", "name": "ACME", "amount": "250.00", "date": "2026-05-01" }
          ],
          "recentActivity": [
            { "id": "a1", "kind": "sales.invoice", "label": "INV-001", "href": "/documents/sales.invoice/d1", "timestamp": "2026-04-28T10:00:00.000Z" }
          ],
          "lowStock": { "count": 2, "threshold": 5 }
        }
        """#.utf8)
        let summary = try decoder.decode(DashboardSummary.self, from: json)
        XCTAssertEqual(summary.tenant?.currency, "USD")
        XCTAssertEqual(summary.kpis?.receivable.value.value, Decimal(string: "1000.50"))
        XCTAssertEqual(summary.kpis?.openInvoices.value, 7)
        XCTAssertEqual(summary.upcomingReceivables.count, 1)
        XCTAssertEqual(summary.upcomingReceivables.first?.id, "c1")
        XCTAssertEqual(summary.upcomingReceivables.first?.date, "2026-05-01")
        XCTAssertEqual(summary.recentActivity.first?.kind, "sales.invoice")
        XCTAssertEqual(summary.recentActivity.first?.label, "INV-001")
        XCTAssertEqual(summary.lowStock.count, 2)
        XCTAssertEqual(summary.lowStock.threshold, 5)
    }

    func testDecodesEmptyTenantPayload() throws {
        let json = Data(#"{ "tenant": null }"#.utf8)
        let summary = try decoder.decode(DashboardSummary.self, from: json)
        XCTAssertNil(summary.tenant)
        XCTAssertNil(summary.kpis)
        XCTAssertTrue(summary.upcomingReceivables.isEmpty)
        XCTAssertTrue(summary.recentActivity.isEmpty)
        XCTAssertEqual(summary.lowStock.count, 0)
    }
}
