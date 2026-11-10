package dev.ishflow.android.auth

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

/**
 * Guard screen shown when the signed-in user has zero permissions in the
 * active tenant (custom role created with no grants). Replaces the standard
 * tab shell so the user is not stranded on an empty home page.
 *
 * Mirrors iOS `RoleNotConfiguredView`. Detection lives in `AppRoot`
 * (via [shouldShowRoleNotConfigured]).
 *
 * [onContactAdmin] hook lets the host map "Contact administrator" to the
 * preferred channel (mailto, deep link, etc.) — the default mailto helper
 * [launchContactAdminMailto] is exposed for callers that just want the iOS
 * behaviour.
 */
@Composable
fun RoleNotConfiguredScreen(
    onContactAdmin: () -> Unit,
    onSignOut: () -> Unit,
) {
    Scaffold { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Icon(
                imageVector = Icons.Filled.Lock,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.primary,
            )
            Spacer(Modifier.height(24.dp))
            Text(
                text = stringResource(R.string.role_not_configured_title),
                style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(12.dp))
            Text(
                text = stringResource(R.string.role_not_configured_body),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(32.dp))
            Button(
                onClick = onContactAdmin,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(R.string.role_not_configured_contact))
            }
            Spacer(Modifier.height(8.dp))
            TextButton(
                onClick = onSignOut,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(R.string.role_not_configured_sign_out))
            }
        }
    }
}

/**
 * Convenience wrapper that launches the platform mail composer pre-filled
 * with the localized subject. Hosts that prefer a different channel should
 * skip this and pass their own [onContactAdmin] lambda.
 *
 * Uses `ACTION_SENDTO` with a `mailto:` URI — the recommended modern
 * intent shape for "compose an email" because it surfaces only email apps
 * and avoids the generic share sheet.
 */
@Composable
fun rememberContactAdminAction(): () -> Unit {
    val context = LocalContext.current
    val subject = stringResource(R.string.role_not_configured_contact_subject)
    return {
        val intent = Intent(Intent.ACTION_SENDTO).apply {
            data = Uri.parse("mailto:")
            putExtra(Intent.EXTRA_SUBJECT, subject)
        }
        val resolved = intent.resolveActivity(context.packageManager)
        if (resolved != null) {
            context.startActivity(intent)
        }
    }
}
