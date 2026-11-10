package dev.ishflow.android.core.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LargeTopAppBar
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.TopAppBarScrollBehavior
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import dev.ishflow.android.core.R

private const val AVATAR_DIAMETER_DP = 32

/**
 * Shared top app bar used by every top-level screen.
 *
 * The bar centers the page [title], hosts a 32-dp circular avatar button on
 * the leading edge, and a `Notifications` bell on the trailing edge. Both
 * actions are driven by callbacks supplied by the caller — typically pulled
 * from [LocalShellActions] so feature screens don't need their own Hilt
 * plumbing for the chrome.
 *
 * The bar applies [TopAppBarDefaults.windowInsets] so the status bar inset
 * is honoured automatically. Without this the dashboard previously rendered
 * a visible gap above its title; see issue #2 in the shell-unification plan.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppTopBar(
    title: String,
    modifier: Modifier = Modifier,
    onAvatarClick: () -> Unit,
    onBellClick: () -> Unit,
    avatarInitial: String = "U",
    notificationBadge: Int = 0,
    scrollBehavior: TopAppBarScrollBehavior? = null,
    extraActions: @Composable RowScope.() -> Unit = {},
) {
    CenterAlignedTopAppBar(
        modifier = modifier,
        title = { Text(title) },
        navigationIcon = {
            AvatarAction(initial = avatarInitial, onClick = onAvatarClick)
        },
        actions = {
            extraActions()
            BellAction(badgeCount = notificationBadge, onClick = onBellClick)
        },
        windowInsets = TopAppBarDefaults.windowInsets,
        scrollBehavior = scrollBehavior,
    )
}

/**
 * Detail-screen variant that uses Material 3's [LargeTopAppBar] so the title
 * collapses smoothly on scroll. The slots and behaviour mirror [AppTopBar].
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppLargeTopBar(
    title: String,
    modifier: Modifier = Modifier,
    onAvatarClick: () -> Unit,
    onBellClick: () -> Unit,
    avatarInitial: String = "U",
    notificationBadge: Int = 0,
    scrollBehavior: TopAppBarScrollBehavior? = null,
    extraActions: @Composable RowScope.() -> Unit = {},
) {
    LargeTopAppBar(
        modifier = modifier,
        title = { Text(title) },
        navigationIcon = {
            AvatarAction(initial = avatarInitial, onClick = onAvatarClick)
        },
        actions = {
            extraActions()
            BellAction(badgeCount = notificationBadge, onClick = onBellClick)
        },
        windowInsets = TopAppBarDefaults.windowInsets,
        scrollBehavior = scrollBehavior,
    )
}

@Composable
private fun AvatarAction(initial: String, onClick: () -> Unit) {
    val description = stringResource(R.string.app_topbar_menu_cd)
    IconButton(
        onClick = onClick,
        modifier = Modifier.semantics { contentDescription = description },
    ) {
        Surface(
            modifier = Modifier.size(AVATAR_DIAMETER_DP.dp),
            shape = CircleShape,
            color = MaterialTheme.colorScheme.primary,
            contentColor = MaterialTheme.colorScheme.onPrimary,
        ) {
            Box(
                modifier = Modifier.size(AVATAR_DIAMETER_DP.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    // API contract: callers supply a single, already-cased
                    // character (MainScaffold uppercases when deriving from
                    // the user's first name). We defensively `take(1)` so a
                    // multi-char string doesn't blow the avatar layout, but
                    // do NOT re-uppercase — that would override locale-aware
                    // casing the caller may have applied.
                    text = initial.take(1).ifEmpty { "U" },
                    style = MaterialTheme.typography.titleSmall,
                )
            }
        }
    }
}

@Composable
private fun BellAction(badgeCount: Int, onClick: () -> Unit) {
    IconButton(onClick = onClick) {
        if (badgeCount > 0) {
            BadgedBox(
                badge = {
                    Badge(
                        containerColor = MaterialTheme.colorScheme.error,
                        contentColor = MaterialTheme.colorScheme.onError,
                    ) {
                        Text(text = badgeCount.toString())
                    }
                },
            ) {
                Icon(
                    imageVector = Icons.Filled.Notifications,
                    contentDescription = stringResource(R.string.app_topbar_bell_cd),
                )
            }
        } else {
            Icon(
                imageVector = Icons.Filled.Notifications,
                contentDescription = stringResource(R.string.app_topbar_bell_cd),
            )
        }
    }
}
