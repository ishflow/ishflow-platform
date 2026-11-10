import APIClient
import AppShared
import Foundation

/// DEBUG-only log. `@autoclosure` means the (PII-bearing) string is never even
/// built in release, so customer/price data can't leak to the device console.
/// Finding G-iOS2.
private func dlog(_ message: @autoclosure () -> String) {
    #if DEBUG
    print(message())
    #endif
}

/// Fetches per-product resolved prices from
/// `GET /api/mobile/products/:id/prices` and picks the entry that matches
/// a requested price-type. Networking-only; the wizard view applies the
/// returned values to its line items.
public struct PriceResolver: Sendable {
    private let api: any APIClient

    public init(api: any APIClient) {
        self.api = api
    }

    /// Returns the resolved unit price for `(productId, priceTypeId)`, or
    /// `nil` when no static/dynamic price is configured for that
    /// price-type. Throws on transport / decode failure so the caller can
    /// fall back to a catalog default (e.g. the product's `salePrice`).
    public func resolve(productId: String, priceTypeId: String) async throws -> Decimal? {
        struct Req: APIRequest {
            typealias Response = ProductPricesResponse
            let productId: String
            var path: String { "/api/mobile/products/\(productId)/prices" }
            let method: HTTPMethod = .get
        }
        dlog("[PriceResolver] GET /api/mobile/products/\(productId)/prices want=\(priceTypeId)")
        let resp = try await api.send(Req(productId: productId))
        dlog("[PriceResolver] response items=\(resp.items.count): \(resp.items.map { "\($0.priceTypeId)=\($0.value.value)" }.joined(separator: ", "))")
        let match = resp.items.first(where: { $0.priceTypeId.lowercased() == priceTypeId.lowercased() })
        if let match {
            dlog("[PriceResolver] matched \(match.priceTypeId) → \(match.value.value)")
        } else {
            dlog("[PriceResolver] NO MATCH for \(priceTypeId)")
        }
        return match?.value.value
    }
}
