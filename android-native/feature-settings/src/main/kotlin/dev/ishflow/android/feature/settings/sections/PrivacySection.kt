package dev.ishflow.android.feature.settings.sections

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BugReport
import androidx.compose.material.icons.filled.QueryStats
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
 * Privacy controls (analytics + crash diagnostics opt-in).
 *
 * Section header sits flush with the surrounding settings list. Toggling the
 * row OR the trailing [Switch] is equivalent — the row's [clickable] modifier
 * flips the same callback, which matches Material 3's preference-row pattern.
 */
@Composable
fun PrivacySection(
    analyticsEnabled: Boolean,
    diagnosticsEnabled: Boolean,
    onAnalyticsToggle: (Boolean) -> Unit,
    onDiagnosticsToggle: (Boolean) -> Unit,
) {
    Column {
        Text(
            text = stringResource(R.string.settings_privacy_title),
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
        )
        ListItem(
            leadingContent = {
                Icon(Icons.Filled.QueryStats, contentDescription = null)
            },
            headlineContent = {
                Text(stringResource(R.string.settings_privacy_analytics))
            },
            supportingContent = {
                Text(stringResource(R.string.settings_privacy_analytics_summary))
            },
            trailingContent = {
                Switch(
                    checked = analyticsEnabled,
                    onCheckedChange = onAnalyticsToggle,
                )
            },
            modifier = Modifier.clickable { onAnalyticsToggle(!analyticsEnabled) },
        )
        ListItem(
            leadingContent = {
                Icon(Icons.Filled.BugReport, contentDescription = null)
            },
            headlineContent = {
                Text(stringResource(R.string.settings_privacy_diagnostics))
            },
            supportingContent = {
                Text(stringResource(R.string.settings_privacy_diagnostics_summary))
            },
            trailingContent = {
                Switch(
                    checked = diagnosticsEnabled,
                    onCheckedChange = onDiagnosticsToggle,
                )
            },
            modifier = Modifier.clickable { onDiagnosticsToggle(!diagnosticsEnabled) },
        )
    }
}
