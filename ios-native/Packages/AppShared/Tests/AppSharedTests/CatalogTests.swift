@testable import AppShared
import XCTest

final class CatalogRecordExpansionTests: XCTestCase {
    private let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()

    func testCatalogRecordDecodesProductWithPriceFields() throws {
        let json = Data(#"""
        {
            "id": "00000000-0000-0000-0000-000000000700",
            "code": "P-100",
            "name": "Premium Widget",
            "createdAt": "2026-04-26T10:00:00Z",
            "updatedAt": "2026-04-26T10:30:00Z",
            "unit": "pcs",
            "costPrice": "50.00",
            "salePrice": "120.50",
            "barcode": "1234567890123"
        }
        """#.utf8)
        let record = try decoder.decode(CatalogRecord.self, from: json)
        XCTAssertEqual(record.code, "P-100")
        XCTAssertEqual(record.name, "Premium Widget")
        XCTAssertEqual(record.unit, "pcs")
        XCTAssertEqual(record.costPrice?.value, Decimal(string: "50.00"))
        XCTAssertEqual(record.salePrice?.value, Decimal(string: "120.50"))
        XCTAssertEqual(record.barcode, "1234567890123")
        XCTAssertNil(record.phone)
        XCTAssertNil(record.email)
    }

    func testCatalogRecordDecodesMinimalCustomer() throws {
        let json = Data(#"""
        {
            "id": "00000000-0000-0000-0000-000000000701",
            "name": "Walk-in customer",
            "createdAt": "2026-04-26T10:00:00Z",
            "updatedAt": "2026-04-26T10:00:00Z"
        }
        """#.utf8)
        let record = try decoder.decode(CatalogRecord.self, from: json)
        XCTAssertEqual(record.name, "Walk-in customer")
        XCTAssertNil(record.code)
        XCTAssertNil(record.unit)
        XCTAssertNil(record.costPrice)
        XCTAssertNil(record.salePrice)
        XCTAssertNil(record.barcode)
        XCTAssertNil(record.phone)
        XCTAssertNil(record.email)
    }
}
