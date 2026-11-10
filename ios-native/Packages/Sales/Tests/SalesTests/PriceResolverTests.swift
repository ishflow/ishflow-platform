import APIClient
import AppShared
import Foundation
@testable import Sales
import XCTest

private actor StubPricesClient: APIClient {
    private let response: ProductPricesResponse
    private(set) var lastPath: String?

    init(response: ProductPricesResponse) {
        self.response = response
    }

    func send<R: APIRequest>(_ request: R) async throws -> R.Response {
        lastPath = request.path
        let data = try JSONEncoder().encode(response)
        return try JSONDecoder().decode(R.Response.self, from: data)
    }
}

final class PriceResolverTests: XCTestCase {
    func testResolvesPriceForType() async throws {
        let stub = StubPricesClient(
            response: ProductPricesResponse(items: [
                ProductPriceItem(
                    priceTypeId: "pt-retail",
                    priceTypeName: "Retail",
                    kind: "static",
                    isDefault: true,
                    value: DecimalString(Decimal(string: "150.00")!)
                ),
                ProductPriceItem(
                    priceTypeId: "pt-wholesale",
                    priceTypeName: "Wholesale",
                    kind: "dynamic",
                    isDefault: false,
                    value: DecimalString(Decimal(string: "120.50")!)
                ),
            ])
        )
        let resolver = PriceResolver(api: stub)

        let value = try await resolver.resolve(
            productId: "prod-1",
            priceTypeId: "pt-wholesale"
        )

        XCTAssertEqual(value, Decimal(string: "120.50"))
        let observed = await stub.lastPath
        XCTAssertEqual(observed, "/api/mobile/products/prod-1/prices")
    }

    func testReturnsNilWhenPriceTypeNotInResponse() async throws {
        let stub = StubPricesClient(response: ProductPricesResponse(items: []))
        let resolver = PriceResolver(api: stub)

        let value = try await resolver.resolve(productId: "prod-1", priceTypeId: "pt-x")

        XCTAssertNil(value)
    }
}
