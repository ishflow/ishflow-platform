// swiftlint:disable nesting identifier_name
@testable import APIClient
import AppShared
import XCTest

final class DemoAPIClientTests: XCTestCase {
    private struct GetReq<R: Decodable & Sendable>: APIRequest {
        typealias Response = R
        let path: String
        let method: HTTPMethod = .get
    }

    private struct PostReq<R: Decodable & Sendable>: APIRequest {
        typealias Response = R
        let path: String
        let method: HTTPMethod = .post
        let body: (any Encodable & Sendable)?
    }

    func testMeRoute() async throws {
        let client = DemoAPIClient()
        let response = try await client.send(GetReq<MeResponse>(path: "/api/mobile/me"))
        XCTAssertEqual(response.tenant?.slug, "demo")
    }

    func testDocumentDetailRouteReturnsRecord() async throws {
        let client = DemoAPIClient()
        let doc = try await client.send(GetReq<DocumentRecord>(
            path: "/api/mobile/documents/sales.invoice/00000000-0000-0000-0000-000000000010"
        ))
        XCTAssertEqual(doc.lines?.count, 2)
        XCTAssertEqual(doc.customer?.name, "Acme Corporation")
    }

    func testDocumentCreateRouteReturnsCreateResponse() async throws {
        struct Body: Encodable { let customerId: String; let date: String }
        let client = DemoAPIClient()
        let resp = try await client.send(PostReq<DocumentCreateResponse>(
            path: "/api/mobile/documents/sales.invoice",
            body: Body(customerId: "x", date: "2026-04-26T00:00:00Z")
        ))
        XCTAssertNotNil(resp.id)
    }

    func testDocumentPostRoute() async throws {
        let client = DemoAPIClient()
        let resp = try await client.send(PostReq<DocumentPostResponse>(
            path: "/api/mobile/documents/sales.invoice/00000000-0000-0000-0000-000000000010/post",
            body: nil
        ))
        XCTAssertGreaterThan(resp.movementCount, 0)
    }

    func testProductDetailRouteReturnsCatalogRecord() async throws {
        let client = DemoAPIClient()
        let product = try await client.send(GetReq<CatalogRecord>(
            path: "/api/mobile/catalogs/inventory.product/00000000-0000-0000-0000-000000000050"
        ))
        XCTAssertEqual(product.salePrice?.value, Decimal(string: "15.0"))
    }

    func testRegisterBalanceCorrectName() async throws {
        let client = DemoAPIClient()
        let balance = try await client.send(GetReq<RegisterBalanceResponse>(
            path: "/api/mobile/registers/inventory.stock_balance/balance"
        ))
        XCTAssertFalse(balance.rows.isEmpty)
    }

    func testUnknownRouteThrowsHttp404() async {
        let client = DemoAPIClient()
        do {
            _ = try await client.send(GetReq<MeResponse>(path: "/api/mobile/wat"))
            XCTFail("expected throw")
        } catch let APIError.http(status, _) {
            XCTAssertEqual(status, 404)
        } catch {
            XCTFail("wrong error: \(error)")
        }
    }
}
