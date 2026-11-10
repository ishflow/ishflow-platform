package dev.ishflow.android.shell

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.filled.HelpOutline
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SheetState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.ishflow.android.R
import dev.ishflow.android.appshared.auth.hasPermission
import dev.ishflow.android.appshared.models.UserSummary

private val SHEET_HORIZONTAL_PADDING = 16.dp
private val SHEET_TOP_PADDING = 12.dp
private val SHEET_BOTTOM_PADDING = 24.dp
private val GROUP_SPACING = 12.dp
private val USER_AVATAR_DIAMETER = 48.dp

/**
 * Actions emitted by [MoreSheet] when the user taps a row. Sealed so each
 * navigation target is exhaustive at the dispatch site.
 */
sealed interface MoreSheetAction {
    data object Settings : MoreSheetAction
    data object Reports : MoreSheetAction

    /**
     * Opens the [NotificationsCenterSheet] from the avatar more sheet. Mirrors
     * iOS's dashboard bell — surfaces recent push, outbox, and sync errors in
     * one combined view without detouring through Settings.
     *
     * Kept here as the reach-through for non-dashboard tabs whose TopAppBars
     * don't host the bell yet. The dashboard top bar now hosts the bell
     * inline (see [dev.ishflow.android.feature.dashboard.DashboardScreen]).
     */
    data object Notifications : MoreSheetAction

    /**
     * Opens the tenant switch screen. Emitted by the Organisation row at the
     * top of the sheet (current tenant name shown as supporting text) so the
     * user can pivot tenant from any screen.
     */
    data object TenantSwitch : MoreSheetAction

    /** Opens the system email composer pre-filled with feedback metadata. */
    data object HelpAndFeedback : MoreSheetAction

    /** Signs out and routes back to the Clerk sign-in screen. */
    data object SignOut : MoreSheetAction
}

/**
 * Bottom sheet anchored to the dashboard avatar. Renders four logical groups
 * separated by 12 dp gaps:
 *  1. User header (non-interactive) — avatar + full name + email.
 *  2. Organisation row — current tenant + chevron → [MoreSheetAction.TenantSwitch].
 *  3. Settings + Reports + Notifications.
 *  4. Help & Çıkış.
 *
 * iOS parity reference: see the "Daha fazla" screenshot dated 2026-05-12.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MoreSheet(
    sheetState: SheetState,
    onAction: (MoreSheetAction) -> Unit,
    onDismiss: () -> Unit,
    viewModel: MoreSheetViewModel = hiltViewModel(),
) {
    val currentUser by viewModel.currentUser.collectAsStateWithLifecycle()
    val permissions by viewModel.permissions.collectAsStateWithLifecycle()
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(
                    start = SHEET_HORIZONTAL_PADDING,
                    end = SHEET_HORIZONTAL_PADDING,
                    top = SHEET_TOP_PADDING,
                    bottom = SHEET_BOTTOM_PADDING,
                ),
            verticalArrangement = Arrangement.spacedBy(GROUP_SPACING),
        ) {
            SheetTitle()
            UserHeaderCard(user = currentUser)
            SettingsGroupCard(
                showReports = permissions.hasPermission("reports:read"),
                onAction = onAction,
            )
            HelpAndSignOutCard(onAction = onAction)
        }
    }
}

@Composable
private fun SheetTitle() {
    Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
        Text(
            text = stringResource(R.string.more_sheet_title),
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
private fun UserHeaderCard(user: UserSummary?) {
    SheetCard {
        ListItem(
            colors = ListItemDefaults.colors(containerColor = Color.Transparent),
            headlineContent = {
                Text(
                    text = displayName(user),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
            },
            supportingContent = {
                Text(
                    text = user?.email.orEmpty(),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            },
            leadingContent = { UserAvatar(user = user) },
        )
    }
}

@Composable
private fun SettingsGroupCard(
    showReports: Boolean,
    onAction: (MoreSheetAction) -> Unit,
) {
    SheetCard {
        Column {
            SheetRow(
                icon = Icons.Filled.Settings,
                label = stringResource(R.string.more_sheet_settings),
                onClick = { onAction(MoreSheetAction.Settings) },
            )
            if (showReports) {
                SheetRow(
                    icon = Icons.Filled.Assessment,
                    label = stringResource(R.string.more_sheet_reports),
                    onClick = { onAction(MoreSheetAction.Reports) },
                )
            }
            SheetRow(
                icon = Icons.Filled.Notifications,
                label = stringResource(R.string.more_sheet_notifications),
                onClick = { onAction(MoreSheetAction.Notifications) },
            )
        }
    }
}

@Composable
private fun HelpAndSignOutCard(onAction: (MoreSheetAction) -> Unit) {
    SheetCard {
        Column {
            SheetRow(
                icon = Icons.AutoMirrored.Filled.HelpOutline,
                label = stringResource(R.string.more_sheet_help),
                onClick = { onAction(MoreSheetAction.HelpAndFeedback) },
            )
            SheetRow(
                icon = Icons.AutoMirrored.Filled.ExitToApp,
                label = stringResource(R.string.more_sheet_signout),
                onClick = { onAction(MoreSheetAction.SignOut) },
                tint = MaterialTheme.colorScheme.error,
            )
        }
    }
}

@Composable
private fun SheetCard(content: @Composable () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        ),
    ) {
        content()
    }
}

@Composable
private fun SheetRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    onClick: () -> Unit,
    tint: Color = MaterialTheme.colorScheme.primary,
) {
    ListItem(
        colors = ListItemDefaults.colors(containerColor = Color.Transparent),
        headlineContent = {
            Text(text = label, color = tint, style = MaterialTheme.typography.bodyLarge)
        },
        leadingContent = { Icon(icon, contentDescription = null, tint = tint) },
        trailingContent = {
            Icon(
                Icons.Filled.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        },
        modifier = Modifier.clickableRow(onClick),
    )
}

@Composable
private fun UserAvatar(user: UserSummary?) {
    val initial = (user?.firstName?.trim()?.firstOrNull()
        ?: user?.lastName?.trim()?.firstOrNull()
        ?: user?.email?.trim()?.firstOrNull { it.isLetterOrDigit() })
        ?.uppercase().orEmpty()
    Surface(
        modifier = Modifier.size(USER_AVATAR_DIAMETER),
        shape = CircleShape,
        color = MaterialTheme.colorScheme.primary,
        contentColor = Color.White,
    ) {
        Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Spacer(modifier = Modifier.height(USER_AVATAR_DIAMETER))
                Text(
                    text = initial.ifEmpty { "?" },
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}

/**
 * Best-effort display name: "First Last" → "First" → email local-part →
 * "User" as the final fallback so the header never renders blank.
 */
private fun displayName(user: UserSummary?): String {
    if (user == null) return ""
    val first = user.firstName?.trim().orEmpty()
    val last = user.lastName?.trim().orEmpty()
    val combined = listOf(first, last).filter { it.isNotEmpty() }.joinToString(" ")
    if (combined.isNotEmpty()) return combined
    val email = user.email
    val localPart = email.substringBefore('@').trim()
    return localPart.ifEmpty { email }
}
