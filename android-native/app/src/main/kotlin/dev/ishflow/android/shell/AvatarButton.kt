package dev.ishflow.android.shell

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.ishflow.android.R

private const val AVATAR_DIAMETER_DP = 36
private const val TENANT_INITIALS_LENGTH = 2

/**
 * Top-end avatar button that opens [MoreSheet]. Reads first-letter initial
 * from [SessionStore][dev.ishflow.android.core.session.SessionStore] via a
 * tiny Hilt-injected VM so we don't have to expose SessionStore to the shell.
 *
 * When the signed-in user has access to two or more tenants, the avatar
 * grows a small badge showing the first two letters of the active org name
 * (e.g. "Akme Ltd" → "AK"). Single-tenant users see the unbadged avatar —
 * a switcher hint there would be noise.
 *
 * Falls back to the generic account icon when no session info is available.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AvatarButton(onClick: () -> Unit, viewModel: AvatarViewModel = hiltViewModel()) {
    val initial by viewModel.initial.collectAsStateWithLifecycle()
    val tenantBadge by viewModel.tenantBadge.collectAsStateWithLifecycle()

    IconButton(onClick = onClick) {
        if (tenantBadge != null) {
            BadgedBox(badge = { Badge { TenantBadgeText(text = tenantBadge!!) } }) {
                AvatarContent(initial = initial)
            }
        } else {
            AvatarContent(initial = initial)
        }
    }
}

@Composable
private fun AvatarContent(initial: String?) {
    if (initial.isNullOrBlank()) {
        Icon(
            imageVector = Icons.Filled.AccountCircle,
            contentDescription = stringResource(R.string.shell_avatar_label),
        )
    } else {
        AvatarInitial(letter = initial)
    }
}

@Composable
private fun TenantBadgeText(text: String) {
    Text(text = text, fontSize = 10.sp)
}

@Composable
private fun AvatarInitial(letter: String) {
    Surface(
        modifier = Modifier.size(AVATAR_DIAMETER_DP.dp),
        shape = CircleShape,
        color = MaterialTheme.colorScheme.primary,
        contentColor = Color.White,
    ) {
        Box(modifier = Modifier.size(AVATAR_DIAMETER_DP.dp), contentAlignment = Alignment.Center) {
            Text(text = letter, style = MaterialTheme.typography.titleSmall)
        }
    }
}

/**
 * Computes the up-to-two-letter tenant initials shown in the avatar badge.
 *
 * Examples:
 *  - "Akme Ltd" → "AK" (first letter of each of the first two words)
 *  - "AcmeCorp" → "AC" (first two letters of a single word)
 *  - ""         → null (caller hides the badge)
 */
internal fun computeTenantInitials(name: String?): String? {
    val trimmed = name?.trim().orEmpty()
    if (trimmed.isEmpty()) return null
    val words = trimmed.split(Regex("\\s+")).filter { it.isNotBlank() }
    if (words.size >= TENANT_INITIALS_LENGTH) {
        return words.take(TENANT_INITIALS_LENGTH).joinToString("") { it.first().uppercase() }
    }
    val singleWord = words.first()
    return singleWord.take(TENANT_INITIALS_LENGTH).uppercase()
}
