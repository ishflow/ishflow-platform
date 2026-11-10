package dev.ishflow.android.feature.onboarding.progress

import androidx.annotation.StringRes
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.RadioButtonUnchecked
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import dev.ishflow.android.R

data class SetupProgressItem(
    val id: String,
    @StringRes val titleRes: Int,
    val done: Boolean,
    val onClick: () -> Unit,
)

/**
 * Compact, dismissable setup-progress card. Collapsed by default; tapping the
 * header row toggles the 5-item checklist below.
 *
 * Auto-hides when all items are done (caller does not need to gate this) so
 * completed users see no setup chrome. Manual dismissal is handled by the
 * caller via [onSkip] — typically wired to a DataStore-backed preference so
 * the dismissal survives across app launches.
 */
@Composable
fun SetupProgressWidget(
    items: List<SetupProgressItem>,
    onSkip: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val total = items.size
    val doneCount = items.count { it.done }
    // Auto-hide path. Manual dismissal is the caller's responsibility.
    if (doneCount == total) return

    var expanded by remember { mutableStateOf(false) }

    Card(modifier = modifier.fillMaxWidth()) {
        // Compact header row. Whole row (minus the action buttons) toggles
        // expanded state. Skip + X both call `onSkip` so dismissal is
        // reachable whether the user taps the explicit label or the icon.
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { expanded = !expanded }
                .padding(start = 16.dp, end = 4.dp, top = 8.dp, bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = if (doneCount > 0) Icons.Default.CheckCircle else Icons.Outlined.RadioButtonUnchecked,
                contentDescription = null,
                tint = if (doneCount > 0) {
                    MaterialTheme.colorScheme.primary
                } else {
                    MaterialTheme.colorScheme.onSurfaceVariant
                },
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = stringResource(R.string.setup_progress_title, doneCount, total),
                style = MaterialTheme.typography.titleSmall,
            )
            Spacer(modifier = Modifier.width(12.dp))
            LinearProgressIndicator(
                progress = { doneCount.toFloat() / total.toFloat() },
                modifier = Modifier
                    .weight(1f)
                    .height(4.dp),
            )
            Spacer(modifier = Modifier.width(8.dp))
            TextButton(onClick = onSkip) {
                Text(text = stringResource(R.string.setup_progress_skip))
            }
            IconButton(onClick = onSkip) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = stringResource(R.string.setup_progress_dismiss_cd),
                )
            }
        }

        // Expanded checklist body. AnimatedVisibility keeps the collapse
        // animation smooth without rebuilding the list items.
        AnimatedVisibility(visible = expanded) {
            Column(
                modifier = Modifier.padding(bottom = 8.dp),
                verticalArrangement = Arrangement.spacedBy(0.dp),
            ) {
                items.forEach { item ->
                    ListItem(
                        leadingContent = {
                            Icon(
                                imageVector = if (item.done) Icons.Default.CheckCircle else Icons.Outlined.RadioButtonUnchecked,
                                contentDescription = null,
                                tint = if (item.done) {
                                    MaterialTheme.colorScheme.primary
                                } else {
                                    MaterialTheme.colorScheme.onSurfaceVariant
                                },
                            )
                        },
                        headlineContent = { Text(stringResource(item.titleRes)) },
                        modifier = Modifier.clickable(enabled = !item.done, onClick = item.onClick),
                    )
                }
            }
        }
    }
}
