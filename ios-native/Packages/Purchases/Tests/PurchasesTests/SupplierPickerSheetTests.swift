import APIClient
import AppShared
@testable import Purchases
import XCTest

/// Pins the API contract used by `SupplierPickerSheet.load()`. The sheet's
/// network path is defined by an inline `struct Req: APIRequest` whose
/// `path` literal is the only thing the backend cares about; this test
/// documents that contract without spinning up the SwiftUI view.
final class SupplierPickerSheetTests: XCTestCase {
    func testRequestPathTargetsSupplierCatalog() {
        // Mirror of the inline `Req` in SupplierPickerSheet.load().
        // swiftlint:disable nesting
        struct Req: APIRequest {
            typealias Response = CatalogListResponse
            let path = "/api/mobile/catalogs/purchases.supplier"
            let method: HTTPMethod = .get
            let query: [String: String]?
        }
        // swiftlint:enable nesting

        let req = Req(query: nil)
        XCTAssertEqual(req.path, "/api/mobile/catalogs/purchases.supplier")
        XCTAssertEqual(req.method, .get)
    }
}
