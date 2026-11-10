@testable import AppShared
import Foundation
import XCTest

final class ProductPricesDecodeTests: XCTestCase {
    func testProductPricesResponseDecodes() throws {
        let json = Data("""
        {
          "items": [
            {
              "priceTypeId": "11111111-1111-1111-1111-111111111111",
              "priceTypeName": "Розничная",
              "kind": "static",
              "isDefault": true,
              "value": "150.00"
            },
            {
              "priceTypeId": "22222222-2222-2222-2222-222222222222",
              "priceTypeName": "Опт",
              "kind": "dynamic",
              "isDefault": false,
              "value": "120.50"
            }
          ]
        }
        """.utf8)
        let resp = try JSONDecoder().decode(ProductPricesResponse.self, from: json)
        XCTAssertEqual(resp.items.count, 2)
        XCTAssertEqual(resp.items[0].priceTypeId, "11111111-1111-1111-1111-111111111111")
        XCTAssertEqual(resp.items[0].value.value, Decimal(string: "150.00"))
        XCTAssertTrue(resp.items[0].isDefault)
        XCTAssertEqual(resp.items[1].kind, "dynamic")
    }

    func testProductPricesResponseToleratesMissingKind() throws {
        let json = Data("""
        {"items":[{"priceTypeId":"a","priceTypeName":"A","isDefault":false,"value":"10.00"}]}
        """.utf8)
        let resp = try JSONDecoder().decode(ProductPricesResponse.self, from: json)
        XCTAssertNil(resp.items.first?.kind)
    }
}
