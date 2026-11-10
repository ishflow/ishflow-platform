package dev.ishflow.android.core.rbac

import org.junit.jupiter.api.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * Mirrors web `platform/engine/permissions.test.ts` sealed-namespace
 * semantics introduced by PR #83/#84. Covers:
 *  - existing `*:*` / module-wildcard behavior for regular modules
 *  - sealed `owner` and `admin.billing` namespaces walled off from `*:*`
 *  - empty-grant fail-open contract (documented in [Permissions]).
 */
class PermissionsTest {

    @Test
    fun `exact match matches`() {
        assertTrue(Permissions.has(setOf("sales.invoice:read"), "sales.invoice:read"))
    }

    @Test
    fun `universal wildcard matches regular permissions`() {
        assertTrue(Permissions.has(setOf("*:*"), "sales.invoice:read"))
    }

    @Test
    fun `universal wildcard does NOT match sealed owner namespace`() {
        assertFalse(Permissions.has(setOf("*:*"), "owner:tenant.delete"))
    }

    @Test
    fun `universal wildcard does NOT match sealed admin_billing namespace`() {
        assertFalse(Permissions.has(setOf("*:*"), "admin.billing:invoice.update"))
    }

    @Test
    fun `owner wildcard matches owner permissions`() {
        assertTrue(Permissions.has(setOf("owner:*"), "owner:tenant.delete"))
    }

    @Test
    fun `owner wildcard does NOT match unrelated namespaces`() {
        assertFalse(Permissions.has(setOf("owner:*"), "sales.invoice:read"))
    }

    @Test
    fun `admin_billing wildcard matches admin_billing permissions`() {
        assertTrue(
            Permissions.has(setOf("admin.billing:*"), "admin.billing:invoice.update"),
        )
    }

    @Test
    fun `admin star module wildcard does NOT pierce sealed admin_billing`() {
        // `admin.*:*` is a module wildcard over the `admin` root, NOT the
        // sealed `admin.billing` root. It must not unlock billing.
        assertFalse(Permissions.has(setOf("admin.*:*"), "admin.billing:invoice.update"))
        assertFalse(
            Permissions.has(setOf("admin.*:invoice.update"), "admin.billing:invoice.update"),
        )
    }

    @Test
    fun `admin_billing star module wildcard does match admin_billing submodule`() {
        // The same-root module wildcard IS allowed: `admin.billing.*:*` is
        // expressed by Kotlin lib syntax via the root sealed prefix.
        assertTrue(
            Permissions.has(
                setOf("admin.billing.*:invoice.update"),
                "admin.billing.invoice:invoice.update",
            ),
        )
    }

    @Test
    fun `action wildcard does NOT pierce sealed namespaces`() {
        assertFalse(Permissions.has(setOf("*:read"), "owner:tenant.read"))
        assertFalse(Permissions.has(setOf("*:read"), "admin.billing:read"))
    }

    @Test
    fun `entity wildcard matches across module wildcard for regular namespaces`() {
        assertTrue(Permissions.has(setOf("sales.invoice:*"), "sales.invoice:write"))
        assertTrue(Permissions.has(setOf("sales.*:*"), "sales.invoice:write"))
        assertTrue(Permissions.has(setOf("sales.*:write"), "sales.invoice:write"))
    }

    @Test
    fun `empty grants returns true — documented fail-open contract`() {
        // Documented in Permissions.kt header: empty grants = fail-open
        // because the server is the real enforcement boundary. Treat as
        // EXPECTED behavior, not a bug, until /me always emits permissions.
        assertTrue(Permissions.has(emptySet(), "sales.invoice:read"))
        assertTrue(Permissions.has(emptySet(), "owner:tenant.delete"))
    }

    @Test
    fun `any returns true if at least one required is granted`() {
        assertTrue(
            Permissions.any(
                granted = setOf("sales.invoice:read"),
                required = listOf("admin:read", "sales.invoice:read"),
            ),
        )
    }

    @Test
    fun `any returns false if no required is granted`() {
        assertFalse(
            Permissions.any(
                granted = setOf("sales.invoice:read"),
                required = listOf("admin:read", "owner:tenant.delete"),
            ),
        )
    }

    @Test
    fun `malformed permission strings do not match`() {
        assertFalse(Permissions.has(setOf("a:b"), ":read"))
        assertFalse(Permissions.has(setOf("a:b"), "sales:"))
        assertFalse(Permissions.has(setOf("a:b"), "no-separator"))
    }
}
