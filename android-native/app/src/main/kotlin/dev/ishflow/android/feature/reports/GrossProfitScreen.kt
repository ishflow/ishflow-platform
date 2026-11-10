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
import dev.ishflow.android.appshared.models.GrossProfit
import dev.ishflow.android.appshared.models.GrossProfitProductRow
import dev.ishflow.android.appshared.ui.ErrorState
import dev.ishflow.android.appshared.ui.PullRefreshHost
import dev.ishflow.android.appshared.ui.stringRes
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GrossProfitScreen(
    onBack: () -> Unit,
    viewModel: GrossProfitViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val refreshing by viewModel.refreshing.collectAsStateWithLifecycle()
    val preset by viewModel.preset.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.reports_gross_profit_title)) },
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
                                shareReport(context, "gross-profit", from, to, viewModel.api)
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
            GrossProfitBody(
                uiState = uiState,
                preset = preset,
                onPreset = viewModel::selectPreset,
                onRetry = viewModel::refresh,
            )
        }
    }
}

@Composable
private fun GrossProfitBody(
    uiState: GrossProfitUiState,
    preset: ReportPeriodPreset,
    onPreset: (ReportPeriodPreset) -> Unit,
    onRetry: () -> Unit,
) {
    when (uiState) {
        is GrossProfitUiState.Loading -> Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) { CircularProgressIndicator() }

        is GrossProfitUiState.Failed -> ErrorState(
            icon = Icons.Filled.ErrorOutline,
            title = stringResource(R.string.error_title),
            message = stringResource(uiState.exception.stringRes()),
            ctaLabel = stringResource(R.string.action_retry),
            onCtaClick = onRetry,
        )

        is GrossProfitUiState.Loaded -> GrossProfitLoaded(
            data = uiState.data,
            preset = preset,
            onPreset = onPreset,
        )
    }
}

@Composable
private fun GrossProfitLoaded(
    data: GrossProfit,
    preset: ReportPeriodPreset,
    onPreset: (ReportPeriodPreset) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = ReportPadding),
    ) {
        item { PeriodPresetChips(selected = preset, onSelect = onPreset) }
        item {
            TotalsCard {
                KeyValueRow(stringResource(R.string.reports_revenue), formatMoney(data.revenue))
                KeyValueRow(stringResource(R.string.reports_cogs), formatMoney(data.cogs))
                KeyValueRow(
                    label = stringResource(R.string.reports_gross_profit),
                    value = formatMoney(data.grossProfit),
                    emphasised = true,
                )
                KeyValueRow(
                    label = stringResource(R.string.reports_margin_pct),
                    value = "${data.marginPct.toPlainString()}%",
                )
            }
        }
        item { SectionHeader(stringResource(R.string.reports_by_product)) }
        items(data.byProduct, key = { it.productId }) { ProductRow(it) }
    }
}

@Composable
private fun ProductRow(row: GrossProfitProductRow) {
    KeyValueRow(
        label = "${row.productName} (${row.marginPct.toPlainString()}%)",
        value = formatMoney(row.profit),
    )
}
