package dev.ishflow.android.auth

/**
 * Decides whether the [RoleNotConfiguredScreen] guard should replace the
 * main tab shell.
 *
 * Mirrors the iOS `MainTabView` short-circuit: when the user is signed in
 * but the active tenant has issued zero permissions (e.g. a custom role
 * with no permission grants), the shell would otherwise strand them on an
 * empty `Главная`. Returning `true` here flips the root to a screen that
 * explains the situation and offers contact-administrator / sign-out.
 *
 * Kept as a pure function so it can be unit-tested without Compose or
 * coroutine plumbing.
 */
fun shouldShowRoleNotConfigured(signedIn: Boolean, permissionCount: Int): Boolean =
    signedIn && permissionCount == 0
