import Foundation

/// Tenant summary.
public struct TenantSummary: Codable, Sendable, Equatable {
    /// Tenant identifier.
    public let id: UUID
    /// URL-safe tenant slug.
    public let slug: String
    /// Display name.
    public let name: String
    /// ISO-4217 currency code.
    public let currency: String
    /// Mobile feature flags for this tenant.
    public let mobileFeatures: MobileFeatures

    /// Memberwise initializer.
    public init(id: UUID, slug: String, name: String, currency: String, mobileFeatures: MobileFeatures) {
        self.id = id
        self.slug = slug
        self.name = name
        self.currency = currency
        self.mobileFeatures = mobileFeatures
    }
}

/// Authenticated user.
public struct UserSummary: Codable, Sendable, Equatable {
    /// User identifier.
    public let id: UUID
    /// Primary email address.
    public let email: String
    /// Optional first name.
    public let firstName: String?
    /// Optional last name.
    public let lastName: String?
    /// Optional avatar URL.
    public let imageUrl: String?

    /// Memberwise initializer.
    public init(id: UUID, email: String, firstName: String?, lastName: String?, imageUrl: String?) {
        self.id = id
        self.email = email
        self.firstName = firstName
        self.lastName = lastName
        self.imageUrl = imageUrl
    }
}

/// One entry in the `MeResponse.memberships` array — a summary of one
/// tenant the user belongs to. Powers the iOS organization switcher.
public struct MembershipSummary: Codable, Sendable, Equatable, Identifiable {
    public let tenantId: String
    public let tenantName: String
    public let tenantSlug: String
    public let primaryRole: String
    public let isCurrent: Bool

    public var id: String { tenantId }

    public init(
        tenantId: String,
        tenantName: String,
        tenantSlug: String,
        primaryRole: String,
        isCurrent: Bool
    ) {
        self.tenantId = tenantId
        self.tenantName = tenantName
        self.tenantSlug = tenantSlug
        self.primaryRole = primaryRole
        self.isCurrent = isCurrent
    }
}

/// Onboarding setup-progress flags surfaced by `/api/mobile/me`. Mirrors the
/// `SetupProgressSchema` Zod object on the server. The backend omits this
/// field once every flag is `true`, so iOS treats it as optional and hides
/// the dashboard widget when nil.
public struct SetupProgress: Codable, Sendable, Equatable {
    public let workspaceCreated: Bool
    public let demoImported: Bool
    public let invitesSent: Bool
    public let firstCustomerAdded: Bool
    public let firstProductAdded: Bool
    public let firstInvoicePosted: Bool

    public init(
        workspaceCreated: Bool,
        demoImported: Bool,
        invitesSent: Bool,
        firstCustomerAdded: Bool,
        firstProductAdded: Bool,
        firstInvoicePosted: Bool
    ) {
        self.workspaceCreated = workspaceCreated
        self.demoImported = demoImported
        self.invitesSent = invitesSent
        self.firstCustomerAdded = firstCustomerAdded
        self.firstProductAdded = firstProductAdded
        self.firstInvoicePosted = firstInvoicePosted
    }
}

/// /api/mobile/me payload.
public struct MeResponse: Codable, Sendable, Equatable {
    /// Authenticated user.
    public let user: UserSummary
    /// Active tenant, if any.
    public let tenant: TenantSummary?
    /// Permission keys granted to the user inside the active tenant.
    public let permissions: [String]
    /// Primary role name derived server-side (e.g. "owner", "sales", "warehouse").
    public let primaryRole: String
    /// Tabs visible to this user, ordered.
    public let tabs: [MobileTab]
    /// FAB actions visible to this user, ordered.
    public let fabActions: [FabAction]
    /// All tenants the user has an active membership in. Used to power the
    /// in-app organization switcher.
    public let memberships: [MembershipSummary]
    /// Onboarding setup-progress flags. Omitted by the server once every step
    /// is complete, so iOS treats it as optional.
    public let setupProgress: SetupProgress?
    /// Master gate for the subscription feature. When `false` (state=`hidden`
    /// on the server), iOS should suppress the Settings → Billing menu entry
    /// and skip any `/api/mobile/billing` calls. Defaults to `true` so legacy
    /// servers that don't yet emit the field stay backwards-compatible.
    public let subscriptionFeatureVisible: Bool

    public init(
        user: UserSummary,
        tenant: TenantSummary?,
        permissions: [String],
        primaryRole: String,
        tabs: [MobileTab],
        fabActions: [FabAction],
        memberships: [MembershipSummary] = [],
        setupProgress: SetupProgress? = nil,
        subscriptionFeatureVisible: Bool = true
    ) {
        self.user = user
        self.tenant = tenant
        self.permissions = permissions
        self.primaryRole = primaryRole
        self.tabs = tabs
        self.fabActions = fabActions
        self.memberships = memberships
        self.setupProgress = setupProgress
        self.subscriptionFeatureVisible = subscriptionFeatureVisible
    }

    private enum CodingKeys: String, CodingKey {
        case user, tenant, permissions, primaryRole, tabs, fabActions, memberships, setupProgress
        case subscriptionFeatureVisible
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.user = try c.decode(UserSummary.self, forKey: .user)
        self.tenant = try c.decodeIfPresent(TenantSummary.self, forKey: .tenant)
        self.permissions = try c.decodeIfPresent([String].self, forKey: .permissions) ?? []
        self.primaryRole = try c.decodeIfPresent(String.self, forKey: .primaryRole) ?? ""
        self.tabs = try c.decodeIfPresent([MobileTab].self, forKey: .tabs) ?? []
        self.fabActions = try c.decodeIfPresent([FabAction].self, forKey: .fabActions) ?? []
        self.memberships = try c.decodeIfPresent([MembershipSummary].self, forKey: .memberships) ?? []
        self.setupProgress = try c.decodeIfPresent(SetupProgress.self, forKey: .setupProgress)
        self.subscriptionFeatureVisible =
            (try c.decodeIfPresent(Bool.self, forKey: .subscriptionFeatureVisible)) ?? true
    }
}

/// /api/mobile/tenants payload.
public struct TenantListResponse: Codable, Sendable {
    /// Available tenants.
    public let items: [TenantSummary]
}

/// /api/mobile/tenants/active payload.
public struct SetActiveTenantResponse: Codable, Sendable {
    /// New bearer token for the switched tenant.
    public let token: String
}
