package dev.ishflow.android.appshared.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import dev.ishflow.android.appshared.R
import dev.ishflow.android.appshared.models.DocumentLine

/**
 * Read-only card showing document line items (product, qty × price, total).
 * Returns early if [lines] is empty or null so callers don't need to guard.
 */
@Composable
fun DocLinesCard(lines: List<DocumentLine>?, modifier: Modifier = Modifier) {
    if (lines.isNullOrEmpty()) return
    Card(modifier = modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = stringResource(R.string.doc_detail_lines_title),
                style = MaterialTheme.typography.titleMedium,
            )
            Spacer(Modifier.height(8.dp))
            lines.forEachIndexed { index, line ->
                ListItem(
                    headlineContent = { Text(line.product?.name ?: line.productName ?: "—") },
                    supportingContent = {
                        Text(
                            stringResource(
                                R.string.doc_detail_line_qty_price,
                                line.quantity,
                                line.price,
                            ),
                        )
                    },
                    trailingContent = { Text(line.total) },
                )
                if (index < lines.lastIndex) HorizontalDivider()
            }
        }
    }
}
