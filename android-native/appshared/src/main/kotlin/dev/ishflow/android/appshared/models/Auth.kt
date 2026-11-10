package dev.ishflow.android.appshared.models

import kotlinx.serialization.Serializable

@Serializable
data class TenantSummary(
    val id: String,
    val slug: String,
    val name: String,
    val currency: String,
    val mobileFeatures: MobileFeatures,
    /**
     * Role the authenticated user holds in this tenant (e.g. `"owner"`,
     * `"manager"`). Nullable for backward compatibility — older `/me`
     * payloads that pre-date the multi-org switcher won't carry it.
     */
    val role: String? = null,
)

@Serializable
data class UserSummary(
    val id: String,
    val email: String,
    val firstName: String? = null,
    val lastName: String? = null,
    val imageUrl: String? = null,
)

/**
 * Response from `POST /api/mobile/tenants/{tenantId}/switch` — a freshly
 * minted HS256 mobile JWT pinned to the target tenant. The client persists
 * this in [TokenStore] BEFORE refetching `/me`; otherwise the bearer on
 * subsequent requests still carries the old `tid` claim and the server
 * resolves to the previous tenant.
 */
@Serializable
data class SwitchTenantResponse(val token: String)

@Serializable
data class CreateWorkspaceRequest(
    val name: String,
    val currency: String,
    val locale: String = "en",
)

@Serializable
data class CreateWorkspaceResponse(
    val tenantId: String,
    val jwt: String,
    val trialEndsAt: String,
)

@Serializable
data class SeedDemoRequest(val tenantId: String)

@Serializable
data class SeedDemoSummary(
    val customers: Int,
    val products: Int,
    val documents: Int,
)

@Serializable
data class SeedDemoResponse(
    val ok: Boolean,
    val summary: SeedDemoSummary,
)

@Serializable
data class MeResponse(
    val user: UserSummary,
    val tenant: TenantSummary? = null,
    val permissions: List<String>,
    val tenants: List<TenantSummary> = emptyList(),
    // RBAC extension — all nullable so an older /me payload decodes cleanly
    // and we fall back to the hard-coded shell + dashboard.
    val primaryRole: String? = null,
    val tabs: List<MobileTab>? = null,
    val fabActions: List<FabAction>? = null,
    val dashboardLayout: DashboardLayout? = null,
)
