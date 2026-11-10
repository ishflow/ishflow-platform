package dev.ishflow.android.appshared.models

import kotlinx.serialization.Serializable

/**
 * Response body of `GET /api/mobile/dashboard`. Mirrors the iOS
 * `DashboardLayout` shape and the server `DashboardResponseSchema`.
 *
 * `tenant` is null when the user has no active org (empty dashboard state).
 * `layout` is a top-to-bottom list of slots; the renderer walks slots and
 * dispatches each [WidgetDescriptor] via the local widget registry. Empty
 * slots are skipped.
 */
@Serializable
data class DashboardResponse(
    val tenant: DashboardTenantInfo? = null,
    val layout: List<DashboardLayoutItem> = emptyList(),
)

@Serializable
data class DashboardTenantInfo(
    val id: String,
    val currency: String,
)

@Serializable
data class DashboardLayoutItem(
    val slot: String,
    val widgets: List<WidgetDescriptor> = emptyList(),
)

/**
 * @deprecated Older shape kept for back-compat — never emitted by the server.
 * Will be removed once all callers migrate to [DashboardResponse].
 */
@Serializable
data class DashboardLayout(
    val slots: List<DashboardSlot> = emptyList(),
)

@Serializable
data class DashboardSlot(
    val id: String,
    val widgets: List<WidgetDescriptor> = emptyList(),
)
