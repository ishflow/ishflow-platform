@testable import AppShared
import XCTest

final class ModelDecodeTests: XCTestCase {
    private let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()

    func testDocumentRecordDecodes() throws {
        let json = Data("""
        {
            "id": "00000000-0000-0000-0000-000000000001",
            "number": "INV-001",
            "date": "2026-04-26T00:00:00Z",
            "status": "POSTED",
            "createdAt": "2026-04-26T10:00:00Z",
            "updatedAt": "2026-04-26T10:00:00Z"
        }
        """.utf8)
        let record = try decoder.decode(DocumentRecord.self, from: json)
        XCTAssertEqual(record.number, "INV-001")
        XCTAssertEqual(record.status, .posted)
    }

    func testRegisterBalanceDecodesDecimalStrings() throws {
        let json = Data("""
        {
            "register": "inventory.stock",
            "asOf": "2026-04-26T00:00:00Z",
            "rows": [
                {
                    "groupKey": {"warehouseId": "wh-1"},
                    "quantity": "12.5",
                    "cost": "1234.56"
                }
            ]
        }
        """.utf8)
        let response = try decoder.decode(RegisterBalanceResponse.self, from: json)
        XCTAssertEqual(response.rows.first?.quantity?.value, Decimal(string: "12.5"))
    }

    func testCatalogRecordDecodesDefaultPriceType() throws {
        let json = Data("""
        {
            "id": "11111111-1111-1111-1111-111111111111",
            "name": "Acme Co",
            "createdAt": "2026-05-01T00:00:00Z",
            "updatedAt": "2026-05-01T00:00:00Z",
            "defaultPriceType": {
                "id": "22222222-2222-2222-2222-222222222222",
                "name": "Розничная"
            }
        }
        """.utf8)
        let rec = try decoder.decode(CatalogRecord.self, from: json)
        XCTAssertEqual(rec.defaultPriceType?.id, "22222222-2222-2222-2222-222222222222")
        XCTAssertEqual(rec.defaultPriceType?.name, "Розничная")
    }

    func testCatalogRecordToleratesAbsentDefaultPriceType() throws {
        let json = Data("""
        {
            "id": "11111111-1111-1111-1111-111111111111",
            "name": "No-priceType",
            "createdAt": "2026-05-01T00:00:00Z",
            "updatedAt": "2026-05-01T00:00:00Z"
        }
        """.utf8)
        let rec = try decoder.decode(CatalogRecord.self, from: json)
        XCTAssertNil(rec.defaultPriceType)
    }

    func testMeResponseDecodesNullableTenant() throws {
        let json = Data("""
        {
            "user": {
                "id": "00000000-0000-0000-0000-000000000002",
                "email": "user@example.com",
                "firstName": null,
                "lastName": null,
                "imageUrl": null
            },
            "tenant": null,
            "permissions": [],
            "primaryRole": "viewer",
            "tabs": [],
            "fabActions": []
        }
        """.utf8)
        let response = try decoder.decode(MeResponse.self, from: json)
        XCTAssertNil(response.tenant)
        XCTAssertEqual(response.user.email, "user@example.com")
        XCTAssertEqual(response.primaryRole, "viewer")
        XCTAssertTrue(response.tabs.isEmpty)
        XCTAssertTrue(response.fabActions.isEmpty)
    }
}
