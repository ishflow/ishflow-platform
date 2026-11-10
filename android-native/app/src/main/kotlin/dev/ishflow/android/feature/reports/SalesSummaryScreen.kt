package dev.ishflow.android.feature.reports

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.IosShare
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.ishflow.android.R
import dev.ishflow.android.appshared.models.SalesSummary
import dev.ishflow.android.appshared.models.SalesSummaryCustomerRow
import dev.ishflow.android.appshared.models.SalesSummaryProductRow
import dev.ishflow.android.appshared.ui.ErrorState
import dev.ishflow.android.appshared.ui.PullRefreshHost
import dev.ishflow.android.appshared.ui.stringRes
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SalesSummaryScreen(
    onBack: () -> Unit,
    viewModel: SalesSummaryViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val refreshing by viewModel.refreshing.collectAsStateWithLifecycle()
    val preset by viewModel.preset.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.reports_sales_summary_title)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.action_back),
                        )
                    }
                },
                actions = {
                    IconButton(onClick = {
                        scope.launch {
                            runCatching {
                                val (from, to) = viewModel.currentPeriod()
                                shareReport(context, "sales-summary", from, to, viewModel.api)
                            }
                        }
                    }) {
                        Icon(
                            imageVector = Icons.Default.IosShare,
                            contentDescription = stringResource(R.string.action_share),
                        )
                    }
                },
            )
        },
    ) { padding ->
        PullRefreshHost(
            isRefreshing = refreshing,
            onRefresh = viewModel::refresh,
            modifier = Modifier.fillMaxSize().padding(padding),
        ) {
            SalesSummaryBody(
                uiState = uiState,
                preset = preset,
                onPreset = viewModel::selectPreset,
                onRetry = viewModel::refresh,
            )
        }
    }
}

@Composable
private fun SalesSummaryBody(
    uiState: SalesSummaryUiState,
    preset: ReportPeriodPreset,
    onPreset: (ReportPeriodPreset) -> Unit,
    onRetry: () -> Unit,
) {
    when (uiState) {
        is SalesSummaryUiState.Loading -> CenteredSpinner()
        is SalesSummaryUiState.Failed -> ErrorState(
            icon = Icons.Filled.ErrorOutline,
            title = stringResource(R.string.error_title),
            message = stringResource(uiState.exception.stringRes()),
            ctaLabel = stringResource(R.string.action_retry),
            onCtaClick = onRetry,
        )
        is SalesSummaryUiState.Loaded -> SalesSummaryLoaded(
            data = uiState.data,
            preset = preset,
            onPreset = onPreset,
        )
    }
}

@Composable
private fun SalesSummaryLoaded(
    data: SalesSummary,
    preset: ReportPeriodPreset,
    onPreset: (ReportPeriodPreset) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = ReportPadding),
    ) {
        item { PeriodPresetChips(selected = preset, onSelect = onPreset) }
        item {
            TotalsCard {
                KeyValueRow(
                    label = stringResource(R.string.reports_total_revenue),
                    value = formatMoney(data.totalRevenue),
                    emphasised = true,
                )
                KeyValueRow(
                    label = stringResource(R.string.reports_invoice_count),
                    value = data.invoiceCount.toString(),
                )
            }
        }
        item { SectionHeader(stringResource(R.string.reports_by_customer)) }
        items(data.byCustomer, key = { it.customerId }) { CustomerRow(it) }
        item { SectionHeader(stringResource(R.string.reports_by_product)) }
        items(data.byProduct, key = { it.productId }) { ProductRow(it) }
    }
}

@Composable
private fun CustomerRow(row: SalesSummaryCustomerRow) {
    KeyValueRow(
        label = "${row.customerName} (${row.count})",
        value = formatMoney(row.total),
    )
}

@Composable
private fun ProductRow(row: SalesSummaryProductRow) {
    KeyValueRow(
        label = "${row.productName} × ${row.qty.toPlainString()}",
        value = formatMoney(row.revenue),
    )
}

@Composable
private fun CenteredSpinner() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}
