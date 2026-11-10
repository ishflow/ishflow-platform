package dev.ishflow.android.core.ui

import androidx.compose.runtime.ProvidableCompositionLocal
import androidx.compose.runtime.staticCompositionLocalOf

/**
 * Per-screen handle into the shell's chrome callbacks. Feature screens that
 * render their own [AppTopBar] read `LocalShellActions.current` and wire its
 * `onAvatarClick` / `onBellClick` into the top-bar slots — instead of having
 * to thread Hilt-injected `onOpenMoreSheet` / `onOpenNotifications` down
 * through every NavHost composable.
 *
 * The default value is an empty stub so previews and unit tests can construct
 * an `AppTopBar` without a surrounding provider; `MainScaffold` overrides it
 * with the real callbacks at the top of the shell.
 */
data class ShellActions(
    val onAvatarClick: () -> Unit,
    val onBellClick: () -> Unit,
    val avatarInitial: String = "U",
    val notificationBadge: Int = 0,
)

val LocalShellActions: ProvidableCompositionLocal<ShellActions> = staticCompositionLocalOf {
    ShellActions(onAvatarClick = {}, onBellClick = {})
}
