package dev.ishflow.android.feature.reports

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import dev.ishflow.android.R

private val SCREEN_PADDING = 16.dp
private val CARD_PADDING = 16.dp
private val CARD_SPACING = 12.dp

private data class ReportCardSpec(val titleRes: Int, val route: String)

private val REPORT_CARDS = listOf(
    ReportCardSpec(R.string.reports_card_sales_summary, "reports/sales-summary"),
    ReportCardSpec(R.string.reports_card_ar_aging, "reports/ar-aging"),
    ReportCardSpec(R.string.reports_card_gross_profit, "reports/gross-profit"),
)

/**
 * Reports landing — three cards that each open a detail screen (sales
 * summary, A/R aging, gross profit). [onOpen] receives the corresponding
 * navigation route and is wired in `MainScaffold`.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportsScreen(onOpen: (String) -> Unit = {}) {
    Scaffold(
        topBar = {
            TopAppBar(title = { Text(stringResource(R.string.reports_title)) })
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(SCREEN_PADDING),
            verticalArrangement = Arrangement.spacedBy(CARD_SPACING),
        ) {
            REPORT_CARDS.forEach { spec -> ReportCard(spec, onClick = { onOpen(spec.route) }) }
        }
    }
}

@Composable
private fun ReportCard(spec: ReportCardSpec, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(CARD_PADDING),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = stringResource(spec.titleRes),
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.weight(1f),
            )
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
