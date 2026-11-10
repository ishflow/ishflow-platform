package dev.ishflow.android.feature.dashboard.widgets

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import dev.ishflow.android.R
import dev.ishflow.android.appshared.models.WidgetDescriptor
import dev.ishflow.android.feature.dashboard.ActivityListItem
import dev.ishflow.android.feature.dashboard.listItems
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

private const val MAX_ROWS = 5

private val activityDateFormatter: DateTimeFormatter =
    DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM).withZone(ZoneId.systemDefault())

/**
 * Renders a server timestamp (e.g. "2026-06-05T20:21:35.254Z") as a localized
 * date. Falls back to the raw string for anything that isn't an ISO instant, so
 * an already-formatted `date` field passes through unchanged.
 */
private fun friendlyActivityDate(raw: String): String =
    runCatching { activityDateFormatter.format(Instant.parse(raw)) }.getOrElse { raw }

/**
 * "Recent activity" card — section header with a "See all" link, plus the
 * last [MAX_ROWS] documents from the server-emitted `list.recentActivity`
 * widget. Tapping a row hands the activity item to the host so it can
 * deep-link to the appropriate detail screen.
 */
@Composable
internal fun RecentActivityCard(
    widgets: List<WidgetDescriptor>,
    onSeeAll: () -> Unit,
    onRowClick: (ActivityListItem) -> Unit,
    modifier: Modifier = Modifier,
) {
    val items = widgets.firstOrNull { it.id == "list.recentActivity" }?.listItems.orEmpty()
    if (items.isEmpty()) return
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        RecentActivityHeader(onSeeAll)
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh),
        ) {
            items.take(MAX_ROWS).forEach { item ->
                RecentActivityRow(item = item, onClick = { onRowClick(item) })
            }
        }
    }
}

@Composable
private fun RecentActivityHeader(onSeeAll: () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Text(
            text = stringResource(R.string.dashboard_recent_activity_title).uppercase(),
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.weight(1f),
        )
        TextButton(onClick = onSeeAll) {
            Text(stringResource(R.string.dashboard_recent_activity_see_all))
        }
    }
}

@Composable
private fun RecentActivityRow(item: ActivityListItem, onClick: () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = item.label ?: item.name.orEmpty(),
                style = MaterialTheme.typography.bodyLarge,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            val supporting = (item.timestamp ?: item.date)?.let(::friendlyActivityDate)
            if (!supporting.isNullOrBlank()) {
                Text(
                    text = supporting,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        Icon(
            imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
            contentDescription = null,
            modifier = Modifier.size(20.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
