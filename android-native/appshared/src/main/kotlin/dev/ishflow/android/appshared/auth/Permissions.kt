package dev.ishflow.android.appshared.auth

/**
 * Wildcard-aware permission match. The server emits per-role permissions
 * in `entity:action` form, plus three wildcard forms:
 *   - `*:*`        — owner/admin pierces everything
 *   - `*:<action>` — viewer carries `*:read`, covers every read
 *   - `<entity>:*` — rare; intended for tenant-admin-of-subtree shapes
 *
 * Both iOS and the web client treat these as equivalent to a literal grant
 * for any narrower `entity:action`. The MoreSheet's role-based gating
 * (e.g. "Reports" link) must respect that — otherwise a viewer with
 * `*:read` would lose access to the Reports landing even though they're
 * permitted to read every report.
 *
 * Returns true iff [required] matches any of the granted permissions,
 * accounting for the three wildcard families above.
 */
fun Collection<String>.hasPermission(required: String): Boolean {
    if (required in this) return true
    if ("*:*" in this) return true
    val colon = required.indexOf(':')
    if (colon <= 0 || colon == required.length - 1) return false
    val entity = required.substring(0, colon)
    val action = required.substring(colon + 1)
    return "$entity:*" in this || "*:$action" in this
}
