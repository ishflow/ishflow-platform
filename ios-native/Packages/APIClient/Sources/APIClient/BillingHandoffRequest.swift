import AppShared
import Foundation

/// Mints a short-lived URL the iOS app opens in `SFSafariViewController` to
/// hand the user off to a Stripe-hosted flow.
///
/// Maps to `POST /api/mobile/billing/handoff` and accepts three flavors via
/// `target`:
/// - `.checkout` — start a Stripe Checkout session for `plan` + `interval`.
/// - `.portal` — open the Stripe Billing Portal for the active subscription.
/// - `.overview` — return the web app's marketing/overview page.
public struct BillingHandoffRequest: APIRequest {
    public typealias Response = BillingHandoffResponse

    /// Handoff destination.
    public enum Target: String, Encodable, Sendable {
        case checkout, portal, overview
    }

    /// Stripe Checkout billing interval.
    public enum Interval: String, Encodable, Sendable {
        case month, year
    }

    /// Where to send the user on the web side.
    public let target: Target
    /// Target plan slug for `.checkout`; `nil` for `.portal` / `.overview`.
    public let plan: String?
    /// Billing interval for `.checkout`; `nil` for `.portal` / `.overview`.
    public let interval: Interval?

    public init(target: Target, plan: String? = nil, interval: Interval? = nil) {
        self.target = target
        self.plan = plan
        self.interval = interval
    }

    public var path: String { "/api/mobile/billing/handoff" }
    public var method: HTTPMethod { .post }
    public var body: (any Encodable & Sendable)? {
        Body(target: target, plan: plan, interval: interval)
    }

    /// Wire payload for `POST /api/mobile/billing/handoff`.
    private struct Body: Encodable, Sendable {
        let target: Target
        let plan: String?
        let interval: Interval?
    }
}
