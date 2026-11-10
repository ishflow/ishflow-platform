@testable import AppShared
import XCTest

final class RegisterBalanceGroupLabelsTests: XCTestCase {
    private let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()

    func testRegisterBalanceRowDecodesGroupLabels() throws {
        let json = Data(#"""
        {
            "register": "inventory.stock",
            "asOf": "2026-04-26T00:00:00Z",
            "rows": [
                {
                    "groupKey": {
                        "warehouseId": "00000000-0000-0000-0000-000000000300",
                        "productId": "00000000-0000-0000-0000-000000000600"
                    },
                    "groupLabels": {
                        "warehouseId": "Main warehouse",
                        "productId": "Widget"
                    },
                    "quantity": "12.5",
                    "cost": "1234.56"
                }
            ]
        }
        """#.utf8)
        let response = try decoder.decode(RegisterBalanceResponse.self, from: json)
        let row = try XCTUnwrap(response.rows.first)
        XCTAssertEqual(row.groupLabels?["warehouseId"], "Main warehouse")
        XCTAssertEqual(row.groupLabels?["productId"], "Widget")
        XCTAssertEqual(row.groupKey["warehouseId"], "00000000-0000-0000-0000-000000000300")
    }

    func testRegisterBalanceRowExposesAmountFromAccountsReceivableShape() throws {
        // Captures the actual prod shape from
        // GET /api/mobile/registers/sales.accounts_receivable/balance.
        // The register declares its money resource as `amount`, not
        // `revenue`, so the iOS row must surface that value via the
        // `.amount` accessor for Dashboard A/R + A/P sums.
        let json = Data(#"""
        {
            "register": "sales.accounts_receivable",
            "asOf": null,
            "rows": [
                {
                    "groupKey": {},
                    "amount": "2750"
                }
            ]
        }
        """#.utf8)
        let response = try decoder.decode(RegisterBalanceResponse.self, from: json)
        let row = try XCTUnwrap(response.rows.first)
        XCTAssertEqual(row.amount?.value, Decimal(string: "2750"))
        XCTAssertEqual(row.resources["amount"]?.value, Decimal(string: "2750"))
    }

    func testRegisterBalanceRowExposesQuantityAndCostFromStockBalance() throws {
        // Captures GET /api/mobile/registers/inventory.stock_balance/balance.
        let json = Data(#"""
        {
            "register": "inventory.stock_balance",
            "asOf": null,
            "rows": [
                {
                    "groupKey": {},
                    "quantity": "25",
                    "totalCost": "2500"
                }
            ]
        }
        """#.utf8)
        let response = try decoder.decode(RegisterBalanceResponse.self, from: json)
        let row = try XCTUnwrap(response.rows.first)
        XCTAssertEqual(row.quantity?.value, Decimal(string: "25"))
        XCTAssertEqual(row.cost?.value, Decimal(string: "2500"))
    }

    func testRegisterBalanceRowGroupLabelsOptional() throws {
        let json = Data(#"""
        {
            "register": "inventory.stock",
            "rows": [
                {
                    "groupKey": {"warehouseId": "wh-1"},
                    "quantity": "5"
                }
            ]
        }
        """#.utf8)
        let response = try decoder.decode(RegisterBalanceResponse.self, from: json)
        let row = try XCTUnwrap(response.rows.first)
        XCTAssertNil(row.groupLabels)
        XCTAssertEqual(row.quantity?.value, Decimal(string: "5"))
    }
}
