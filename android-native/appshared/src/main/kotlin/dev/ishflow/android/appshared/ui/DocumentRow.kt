package dev.ishflow.android.appshared.ui

import androidx.compose.material3.ListItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import dev.ishflow.android.appshared.models.DocumentRecord
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

@Composable
fun DocumentRow(record: DocumentRecord, modifier: Modifier = Modifier) {
    val formatter = remember {
        DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM)
            .withZone(ZoneId.systemDefault())
    }
    ListItem(
        headlineContent = { Text(record.number) },
        supportingContent = { Text(formatter.format(record.date)) },
        trailingContent = { StatusChip(record.status) },
        modifier = modifier,
    )
}
