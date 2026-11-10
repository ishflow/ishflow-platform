import AppShared
import Foundation

/// Fetches the current tenant's billing summary.
///
/// Maps to `GET /api/mobile/billing` which returns the active plan, Stripe
/// status, trial timer (if any), plan limits, and a usage snapshot in one
/// round-trip.
public struct BillingRequest: APIRequest {
    public typealias Response = BillingResponse

    public init() {}

    public var path: String { "/api/mobile/billing" }
    public var method: HTTPMethod { .get }
}
