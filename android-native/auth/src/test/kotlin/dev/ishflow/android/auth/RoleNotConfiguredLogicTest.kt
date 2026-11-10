package dev.ishflow.android.auth

import org.junit.jupiter.api.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class RoleNotConfiguredLogicTest {

    @Test
    fun `not signed in never shows guard`() {
        assertFalse(shouldShowRoleNotConfigured(signedIn = false, permissionCount = 0))
    }

    @Test
    fun `signed in with no permissions shows guard`() {
        assertTrue(shouldShowRoleNotConfigured(signedIn = true, permissionCount = 0))
    }

    @Test
    fun `signed in with at least one permission does not show guard`() {
        assertFalse(shouldShowRoleNotConfigured(signedIn = true, permissionCount = 1))
    }
}
