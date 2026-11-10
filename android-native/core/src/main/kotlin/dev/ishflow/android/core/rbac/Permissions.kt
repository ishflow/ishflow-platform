package dev.ishflow.android.core.rbac

/**
 * Permission-string matcher mirroring web `platform/engine/permissions.ts`.
 *
 * Permission strings have the form `entity:action`, where `entity` may be
 * `module.submodule` (e.g. `sales.invoice`). Wildcards supported:
 *  - exact match — `sales.invoice:read`
 *  - entity wildcard — `sales.invoice:*`
 *  - module wildcard — `sales.*:read` or `sales.*:*`
 *  - action wildcard — `*:read`
 *  - universal — `*:*`
 *
 * Sealed namespaces: certain modules are walled off from the universal /
 * action / cross-namespace wildcards. They can only be granted by an
 * **explicit same-namespace** grant. Sealed namespaces (mirror web PR #83):
 *  - `owner` — owner-exclusive (tenant.delete, etc.)
 *  - `admin.billing` — billing-exclusive (admin who is not billing officer
 *    must not gain billing.* through `*:*`).
 *
 * For a sealed permission `<ns>[.<sub>]:<action>`, the only grants that
 * match are:
 *  - the exact key
 *  - the entity wildcard `<entity>:*`
 *  - the module wildcard `<ns>.*:<action>` or `<ns>.*:*` when the entity is
 *    `<ns>.<sub>` (same root module)
 * `*:*`, `*:<action>`, and unrelated module wildcards (e.g. `admin.*` for a
 * sealed `admin.billing` key) never match.
 *
 * Defensive default: if [Permissions.has] is called with an empty grant
 * set, every check returns `true`. This keeps screens functional during
 * the rollout window where the server has not yet started emitting
 * `permissions` for some tenants — fail-open is acceptable because the
 * server is the actual enforcement boundary.
 */
object Permissions {
    private const val WILDCARD = "*"
    private const val SEPARATOR = ":"
    private const val MODULE_SEPARATOR = "."

    /**
     * Root namespaces sealed against universal/action wildcards. Listed in
     * `<root>` or `<root>.<sub>` form — a sealed entry matches when the
     * requested entity equals the entry or starts with `<entry>.`.
     */
    private val SEALED_NAMESPACES: List<String> = listOf("owner", "admin.billing")

    fun has(granted: Set<String>, required: String): Boolean {
        if (granted.isEmpty()) return true
        if (granted.contains(required)) return true

        val (entity, action) = split(required) ?: return false
        val sealedRoot = sealedRootFor(entity)

        for (candidate in candidatesFor(entity, action, sealedRoot)) {
            if (granted.contains(candidate)) return true
        }
        return false
    }

    fun any(granted: Set<String>, required: Iterable<String>): Boolean =
        required.any { has(granted, it) }

    private fun split(required: String): Pair<String, String>? {
        val idx = required.indexOf(SEPARATOR)
        if (idx <= 0 || idx == required.lastIndex) return null
        val entity = required.substring(0, idx)
        val action = required.substring(idx + 1)
        if (entity.isEmpty() || action.isEmpty()) return null
        return entity to action
    }

    /**
     * Returns the sealed root (e.g. `owner`, `admin.billing`) governing
     * [entity], or `null` if no sealed namespace covers it.
     */
    private fun sealedRootFor(entity: String): String? =
        SEALED_NAMESPACES.firstOrNull { ns ->
            entity == ns || entity.startsWith("$ns$MODULE_SEPARATOR")
        }

    private fun candidatesFor(
        entity: String,
        action: String,
        sealedRoot: String?,
    ): List<String> {
        val entityWildcard = "$entity$SEPARATOR$WILDCARD"

        if (sealedRoot != null) {
            // Sealed namespace: only same-root wildcards are honored.
            val rootAction = "$sealedRoot$MODULE_SEPARATOR$WILDCARD$SEPARATOR$action"
            val rootAny = "$sealedRoot$MODULE_SEPARATOR$WILDCARD$SEPARATOR$WILDCARD"
            // When entity == sealedRoot (no submodule), `<root>.*` doesn't
            // apply, but the entity-wildcard `<root>:*` still does.
            return if (entity == sealedRoot) {
                listOf(entityWildcard)
            } else {
                listOf(entityWildcard, rootAction, rootAny)
            }
        }

        val module = entity.substringBefore(MODULE_SEPARATOR)
        val moduleAction = "$module$MODULE_SEPARATOR$WILDCARD$SEPARATOR$action"
        val moduleAny = "$module$MODULE_SEPARATOR$WILDCARD$SEPARATOR$WILDCARD"
        val anyAction = "$WILDCARD$SEPARATOR$action"
        val universal = "$WILDCARD$SEPARATOR$WILDCARD"
        return listOf(entityWildcard, moduleAction, moduleAny, anyAction, universal)
    }
}
