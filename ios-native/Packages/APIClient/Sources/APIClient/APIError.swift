import Foundation

/// Payload accompanying an `APIError.planLimit` case. Mirrors the
/// `PlanLimitErrorJSON` shape emitted by the server's `PlanLimitError`
/// when a tenant exceeds its plan ceiling (HTTP 402).
public struct PlanLimitErrorPayload: Codable, Sendable, Equatable {
    /// The plan-limit category that was breached. Raw values match the
    /// server's `PlanLimitKind` (snake_case for compound names).
    public enum Kind: String, Codable, Sendable {
        case members
        case monthlyPostedDocs = "monthly_posted_docs"
        case storageBytes = "storage_bytes"
        case savedViews = "saved_views"
        case advancedReports = "advanced_reports"
        case periodClose = "period_close"
        case apiAccess = "api_access"
        case customBranding = "custom_branding"
        case sso
    }

    public let kind: Kind
    public let current: Int
    public let allowed: Int
    /// Suggested upgrade plan name (`pro`, `business`, ...). `nil` when the
    /// feature is enterprise-only or no upgrade path exists.
    public let upgradeTo: String?

    public init(
        kind: Kind,
        current: Int,
        allowed: Int,
        upgradeTo: String?
    ) {
        self.kind = kind
        self.current = current
        self.allowed = allowed
        self.upgradeTo = upgradeTo
    }
}

/// Errors thrown by `APIClient` implementations.
public enum APIError: Error, Sendable {
    /// Underlying URL loading system error.
    case network(URLError)
    /// Non-2xx HTTP response with optional response body for diagnostics.
    case http(status: Int, body: Data?)
    /// JSON decoding failed; payload describes the underlying error.
    case decoding(String)
    /// The request URL could not be constructed.
    case invalidURL
    /// A token was required but the token provider returned nil.
    case missingToken
    /// HTTP 402 — tenant has exceeded a plan ceiling. Payload carries
    /// the breached limit kind plus current/allowed counts and an
    /// upgrade-to plan suggestion for the UI to render a CTA.
    case planLimit(PlanLimitErrorPayload)
    /// The device is offline; the mutation was persisted to the sync
    /// queue and will be delivered automatically once connectivity
    /// returns. Surfaced in the notification center's "Çevrimdışı" tab.
    case queuedOffline
    /// A write could not reach the server (server unreachable / 5xx).
    /// The mutation was recorded as a sync error so it shows up in the
    /// notification center's "Senkronizasyon" tab for manual retry.
    case syncFailed

    /// Localization key for a human-friendly error message.
    public var localizedDescription: String {
        switch self {
        case .network:
            "network.error.noConnection"
        case let .http(status, _):
            switch status {
            case 401: "error.unauthorized"
            case 404: "error.notFound"
            case 500 ... 599: "error.server"
            default: "error.http"
            }
        case .decoding:
            "error.decoding"
        case .invalidURL:
            "error.invalidURL"
        case .missingToken:
            "error.missingToken"
        case .planLimit:
            "error.planLimit"
        case .queuedOffline:
            "error.queuedOffline"
        case .syncFailed:
            "error.syncFailed"
        }
    }
}
