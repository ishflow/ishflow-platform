import Foundation

/// Hard quotas for the active subscription plan.
///
/// Mirrors the `PlanLimits` Zod schema in
/// `packages/mobile-api-contract/src/billing.ts` so the iOS client and the
/// backend stay in lock-step. All counts are inclusive upper bounds; the
/// server enforces them via `assertPlanAllows` before mutating data.
public struct PlanLimits: Codable, Sendable, Equatable {
    /// Maximum number of organization members allowed on the plan.
    public let members: Int
    /// Maximum number of POSTED documents per calendar month.
    public let monthlyPostedDocs: Int
    /// Maximum total attachment storage in bytes.
    public let storageBytes: Int
    /// Maximum number of saved list views.
    public let savedViews: Int

    public init(
        members: Int,
        monthlyPostedDocs: Int,
        storageBytes: Int,
        savedViews: Int
    ) {
        self.members = members
        self.monthlyPostedDocs = monthlyPostedDocs
        self.storageBytes = storageBytes
        self.savedViews = savedViews
    }
}

/// Current consumption snapshot for the tenant.
///
/// Field-for-field aligned with `PlanLimits` so a UI can render a usage strip
/// by zipping `(limits, usage)` pair-wise. Values are always non-negative.
public struct UsageSnapshot: Codable, Sendable, Equatable {
    /// Member seats currently in use.
    public let members: Int
    /// POSTED documents created so far this calendar month.
    public let monthlyPostedDocs: Int
    /// Total attachment storage in bytes currently consumed.
    public let storageBytes: Int
    /// Number of saved views currently configured.
    public let savedViews: Int

    public init(
        members: Int,
        monthlyPostedDocs: Int,
        storageBytes: Int,
        savedViews: Int
    ) {
        self.members = members
        self.monthlyPostedDocs = monthlyPostedDocs
        self.storageBytes = storageBytes
        self.savedViews = savedViews
    }
}

/// Subscription summary returned by `GET /api/mobile/billing`.
///
/// Pairs the active plan and Stripe status with `PlanLimits` + `UsageSnapshot`
/// so the iOS billing screen can render the entire state in one round-trip
/// without follow-up queries.
public struct BillingResponse: Codable, Sendable, Equatable {
    /// Subscription tiers offered by the platform.
    ///
    /// `free` ships with no Stripe subscription; `enterprise` is provisioned
    /// out-of-band by sales. Everything else is self-serve via Stripe.
    public enum Plan: String, Codable, Sendable {
        case free, starter, pro, business, enterprise
    }

    /// Stripe-mirrored subscription status.
    ///
    /// `past_due` is wire-encoded as snake_case to mirror the Stripe API; all
    /// other cases happen to match the Swift identifier verbatim.
    public enum Status: String, Codable, Sendable {
        case active, trialing
        case pastDue = "past_due"
        case suspended, cancelled
    }

    /// Active subscription tier.
    public let plan: Plan
    /// Stripe-mirrored subscription status.
    public let status: Status
    /// Trial expiry timestamp; `nil` outside a trial window.
    public let trialEndsAt: Date?
    /// Stripe customer identifier when one exists.
    public let stripeCustomerId: String?
    /// Stripe subscription identifier when one exists.
    public let stripeSubscriptionId: String?
    /// ISO 4217 billing currency.
    public let currency: String
    /// Plan quotas.
    public let limits: PlanLimits
    /// Current consumption.
    public let usage: UsageSnapshot
    /// Master gate for the Stripe Checkout / Billing Portal flow. When false
    /// the iOS BillingView replaces "See plans" / "Manage on web" buttons with
    /// a "Contact admin for manual upgrade" disabled state.
    public let paymentsEnabled: Bool

    public init(
        plan: Plan,
        status: Status,
        trialEndsAt: Date?,
        stripeCustomerId: String?,
        stripeSubscriptionId: String?,
        currency: String,
        limits: PlanLimits,
        usage: UsageSnapshot,
        paymentsEnabled: Bool = false
    ) {
        self.plan = plan
        self.status = status
        self.trialEndsAt = trialEndsAt
        self.stripeCustomerId = stripeCustomerId
        self.stripeSubscriptionId = stripeSubscriptionId
        self.currency = currency
        self.limits = limits
        self.usage = usage
        self.paymentsEnabled = paymentsEnabled
    }

    private enum CodingKeys: String, CodingKey {
        case plan, status, trialEndsAt, stripeCustomerId, stripeSubscriptionId
        case currency, limits, usage, paymentsEnabled
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        plan = try c.decode(Plan.self, forKey: .plan)
        status = try c.decode(Status.self, forKey: .status)
        trialEndsAt = try c.decodeIfPresent(Date.self, forKey: .trialEndsAt)
        stripeCustomerId = try c.decodeIfPresent(String.self, forKey: .stripeCustomerId)
        stripeSubscriptionId = try c.decodeIfPresent(String.self, forKey: .stripeSubscriptionId)
        currency = try c.decode(String.self, forKey: .currency)
        limits = try c.decode(PlanLimits.self, forKey: .limits)
        usage = try c.decode(UsageSnapshot.self, forKey: .usage)
        paymentsEnabled = (try c.decodeIfPresent(Bool.self, forKey: .paymentsEnabled)) ?? false
    }
}

/// One-shot handoff URL the iOS app opens in Safari for Stripe Checkout /
/// Billing Portal flows.
///
/// The URL is short-lived; the backend embeds a single-use token in the query
/// string and rejects any request after `expiresAt`.
public struct BillingHandoffResponse: Codable, Sendable, Equatable {
    /// Signed URL to open in `SFSafariViewController`.
    public let url: URL
    /// Server-side expiry; UI should refuse to open the URL after this point.
    public let expiresAt: Date

    public init(url: URL, expiresAt: Date) {
        self.url = url
        self.expiresAt = expiresAt
    }
}
