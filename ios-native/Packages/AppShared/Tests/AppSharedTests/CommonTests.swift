@testable import AppShared
import XCTest

final class CatalogRefTests: XCTestCase {
    private let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()

    func testCatalogRefDecodesIdNameAndCode() throws {
        let json = Data(#"""
        {
            "id": "00000000-0000-0000-0000-000000000010",
            "code": "C-001",
            "name": "Acme Corp"
        }
        """#.utf8)
        let ref = try decoder.decode(CatalogRef.self, from: json)
        XCTAssertEqual(ref.id, UUID(uuidString: "00000000-0000-0000-0000-000000000010"))
        XCTAssertEqual(ref.code, "C-001")
        XCTAssertEqual(ref.name, "Acme Corp")
    }

    func testCatalogRefDecodesWithoutCode() throws {
        let json = Data(#"""
        {
            "id": "00000000-0000-0000-0000-000000000011",
            "name": "Walk-in customer"
        }
        """#.utf8)
        let ref = try decoder.decode(CatalogRef.self, from: json)
        XCTAssertEqual(ref.id, UUID(uuidString: "00000000-0000-0000-0000-000000000011"))
        XCTAssertNil(ref.code)
        XCTAssertEqual(ref.name, "Walk-in customer")
    }
}
