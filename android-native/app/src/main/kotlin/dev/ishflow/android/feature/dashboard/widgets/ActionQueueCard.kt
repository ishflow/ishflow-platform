package dev.ishflow.android.feature.dashboard.widgets

import androidx.annotation.StringRes
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Inventory
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import dev.ishflow.android.R
import dev.ishflow.android.appshared.models.WidgetDescriptor
import dev.ishflow.android.feature.dashboard.kpiCount
import dev.ishflow.android.feature.dashboard.listItems

/**
 * Destination signalled by an action-queue row tap. The hosting screen
 * maps each value to a navigation route — kept here so the widget itself
 * stays Compose-free of NavController references.
 */
internal enum class ActionTarget {
    OverdueReceivables,
    LowStock,
    Unposted,
    UpcomingPayables,
}

/**
 * "Needs attention" card — a section header + a stack of action-queue rows.
 * Each row mirrors iOS's `QueueRow`: icon + "{count} {label}" + chevron.
 * Returns silently when there are zero rows so the dashboard stays clean
 * for healthy tenants.
 */
@Composable
internal fun ActionQueueCard(
    widgets: List<WidgetDescriptor>,
    onTargetClick: (ActionTarget) -> Unit,
    modifier: Modifier = Modifier,
) {
    val rows = buildQueueRows(widgets)
    if (rows.isEmpty()) return
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = stringResource(R.string.dashboard_attention_section).uppercase(),
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh),
        ) {
            rows.forEachIndexed { index, row ->
                if (index > 0) HorizontalDivider()
                ActionQueueRow(row = row, onClick = { onTargetClick(row.target) })
            }
        }
    }
}

internal data class ActionQueueRow(
    val target: ActionTarget,
    val icon: ImageVector,
    @StringRes val labelRes: Int,
    val count: Int,
)

@Composable
private fun ActionQueueRow(row: ActionQueueRow, onClick: () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
    ) {
        Icon(
            imageVector = row.icon,
            contentDescription = null,
            modifier = Modifier.size(24.dp),
            tint = MaterialTheme.colorScheme.primary,
        )
        Text(
            text = "${row.count} ${stringResource(row.labelRes)}",
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.weight(1f).padding(start = 12.dp),
        )
        Icon(
            imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
            contentDescription = null,
            modifier = Modifier.size(20.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

private fun buildQueueRows(widgets: List<WidgetDescriptor>): List<ActionQueueRow> {
    val rows = mutableListOf<ActionQueueRow>()
    widgets.firstOrNull { it.id == "action.upcomingReceivables" }?.let { w ->
        val overdueCount = w.listItems.count { item -> isOverdue(item.date) }
        if (overdueCount > 0) {
            rows.add(
                ActionQueueRow(
                    target = ActionTarget.OverdueReceivables,
                    icon = Icons.Filled.Schedule,
                    labelRes = R.string.dashboard_action_overdue_title,
                    count = overdueCount,
                ),
            )
        }
    }
    widgets.firstOrNull { it.id == "action.lowStock" }?.let { w ->
        val count = w.kpiCount ?: 0
        if (count > 0) {
            rows.add(
                ActionQueueRow(
                    target = ActionTarget.LowStock,
                    icon = Icons.Filled.Inventory,
                    labelRes = R.string.dashboard_action_low_stock_title,
                    count = count,
                ),
            )
        }
    }
    widgets.firstOrNull { it.id == "action.unposted" }?.let { w ->
        val count = w.kpiCount ?: 0
        if (count > 0) {
            rows.add(
                ActionQueueRow(
                    target = ActionTarget.Unposted,
                    icon = Icons.Filled.WarningAmber,
                    labelRes = R.string.dashboard_action_unposted_title,
                    count = count,
                ),
            )
        }
    }
    widgets.firstOrNull { it.id == "action.upcomingPayables" }?.let { w ->
        val count = w.listItems.size
        if (count > 0) {
            rows.add(
                ActionQueueRow(
                    target = ActionTarget.UpcomingPayables,
                    icon = Icons.Filled.CreditCard,
                    labelRes = R.string.dashboard_action_upcoming_payables_title,
                    count = count,
                ),
            )
        }
    }
    return rows
}

private fun isOverdue(rawDate: String?): Boolean {
    val parts = rawDate?.split('-') ?: return false
    if (parts.size != 3) return false
    val (yStr, mStr, dStr) = parts
    val y = yStr.toIntOrNull() ?: return false
    val m = mStr.toIntOrNull() ?: return false
    val d = dStr.toIntOrNull() ?: return false
    val due = java.time.LocalDate.of(y, m, d)
    return due.isBefore(java.time.LocalDate.now())
}
