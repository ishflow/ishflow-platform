import Foundation
import Observation

/// Active-tenant session state held by the app shell. Populated from `/v1/me` after
/// sign-in and refreshed on cold launch. `@Observable` so SwiftUI views can subscribe
/// via `.environment(session)` without manual change tracking.
@Observable
public final class AppSession {
    /// Currently authenticated user, if `bootstrap()` has resolved successfully.
    public var user: UserSummary?
    /// Active tenant, if the user has selected (or has only) one.
    public var tenant: TenantSummary?
    /// Permission keys granted to the user inside the active tenant.
    public var permissions: [String] = []
    /// Primary role name (e.g. "owner", "sales", "warehouse").
    public var primaryRole: String = ""
    /// Tabs visible to this user, ordered.
    public var tabs: [MobileTab] = []
    /// FAB actions visible to this user, ordered.
    public var fabActions: [FabAction] = []
    /// All tenants the user has an active membership in (for the org switcher).
    public var memberships: [MembershipSummary] = []
    /// Onboarding setup-progress flags for the active tenant. Nil when the
    /// backend omits the field (no active tenant, or every step complete).
    public var setupProgress: SetupProgress?
    /// Whether the subscription feature should render anywhere in the app.
    /// Drives the visibility of the Settings → Billing menu entry.
    public var subscriptionFeatureVisible: Bool = true

    /// Create an empty session. Populate via `update(from:)` after fetching `/v1/me`.
    public init() {}

    /// Replace user / tenant / permissions from a freshly decoded `/me` payload.
    public func update(from response: MeResponse) {
        user = response.user
        tenant = response.tenant
        permissions = response.permissions
        primaryRole = response.primaryRole
        tabs = response.tabs
        fabActions = response.fabActions
        memberships = response.memberships
        setupProgress = response.setupProgress
        subscriptionFeatureVisible = response.subscriptionFeatureVisible
    }

    /// Resets all session state to the unauthenticated baseline.
    public func clear() {
        user = nil
        tenant = nil
        permissions = []
        primaryRole = ""
        tabs = []
        fabActions = []
        memberships = []
        setupProgress = nil
        subscriptionFeatureVisible = true
    }

    /// True when the user has an active tenant but zero permissions — i.e. a
    /// custom role with no permission grants. Used by `MainTabView` to
    /// short-circuit the tab shell to `RoleNotConfiguredView`.
    public var isRoleNotConfigured: Bool {
        tenant != nil && permissions.isEmpty
    }
}
