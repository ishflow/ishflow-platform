package dev.ishflow.android.appshared.models

import kotlinx.serialization.Serializable

/**
 * Server-driven bottom-bar tab descriptor returned by `/api/mobile/me`.
 *
 * `id` selects the local Compose screen via the app-side tab registry.
 * `icon` is an SF Symbol string (iOS-first); Android maps to a Material
 * `ImageVector`. `labelKey` is currently discarded in favour of an Android
 * resource id keyed off `id` so localisation goes through the platform.
 */
@Serializable
data class MobileTab(
    val id: String,
    val labelKey: String? = null,
    val icon: String? = null,
    val order: Int = 0,
)

/**
 * Server-driven "+" sheet entry returned by `/api/mobile/me`.
 *
 * `id` maps onto a local wizard route. Same icon-string conventions as
 * [MobileTab].
 */
@Serializable
data class FabAction(
    val id: String,
    val labelKey: String? = null,
    val icon: String? = null,
    val order: Int = 0,
)

/**
 * Single widget hint emitted by the server inside a [DashboardLayout] slot.
 *
 * `type` (e.g. `kpi`, `chart`, `list`) selects an Android renderer; `data`
 * is an opaque map the renderer interprets. Kept loose so new widget shapes
 * roll out without a client release.
 */
@Serializable
data class WidgetDescriptor(
    val id: String,
    val type: String,
    val data: Map<String, kotlinx.serialization.json.JsonElement> = emptyMap(),
)
