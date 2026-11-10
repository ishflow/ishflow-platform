package dev.ishflow.android.feature.settings.sections

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import dev.ishflow.android.feature.settings.R

/**
 * Security section for Settings: biometric unlock toggle.
 *
 * Biometric toggle persists to [dev.ishflow.android.auth.biometric.BiometricStore];
 * AppRoot watches the same flow and gates the shell on next cold start.
 */
@Composable
fun SecuritySection(
    biometricEnabled: Boolean,
    onBiometricToggle: (Boolean) -> Unit,
) {
    Column {
        Text(
            text = stringResource(R.string.settings_security_title),
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
        )
        ListItem(
            leadingContent = { Icon(Icons.Filled.Fingerprint, contentDescription = null) },
            headlineContent = { Text(stringResource(R.string.settings_security_biometric)) },
            trailingContent = {
                Switch(checked = biometricEnabled, onCheckedChange = onBiometricToggle)
            },
            modifier = Modifier.clickable { onBiometricToggle(!biometricEnabled) },
        )
    }
}
