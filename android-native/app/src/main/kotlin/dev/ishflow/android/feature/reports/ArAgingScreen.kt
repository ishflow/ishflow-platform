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
import dev.ishflow.android.appshared.models.ArAging
import dev.ishflow.android.appshared.models.ArAgingBucketLabel
import dev.ishflow.android.appshared.models.ArAgingBucketRow
import dev.ishflow.android.appshared.models.ArAgingCustomerRow
import dev.ishflow.android.appshared.ui.ErrorState
import dev.ishflow.android.appshared.ui.PullRefreshHost
import dev.ishflow.android.appshared.ui.stringRes
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ArAgingScreen(
    onBack: () -> Unit,
    viewModel: ArAgingViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val refreshing by viewModel.refreshing.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.reports_ar_aging_title)) },
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
                                // ar-aging is a snapshot report: no period params
                                shareReport(context, "ar-aging", null, null, viewModel.api)
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
            ArAgingBody(uiState = uiState, onRetry = viewModel::refresh)
        }
    }
}

@Composable
private fun ArAgingBody(uiState: ArAgingUiState, onRetry: () -> Unit) {
    when (uiState) {
        is ArAgingUiState.Loading -> Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) { CircularProgressIndicator() }

        is ArAgingUiState.Failed -> ErrorState(
            icon = Icons.Filled.ErrorOutline,
            title = stringResource(R.string.error_title),
            message = stringResource(uiState.exception.stringRes()),
            ctaLabel = stringResource(R.string.action_retry),
            onCtaClick = onRetry,
        )

        is ArAgingUiState.Loaded -> ArAgingLoaded(uiState.data)
    }
}

@Composable
private fun ArAgingLoaded(data: ArAging) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = ReportPadding),
    ) {
        item {
            TotalsCard {
                data.buckets.forEach { BucketRow(it) }
            }
        }
        item { SectionHeader(stringResource(R.string.reports_by_customer)) }
        items(data.byCustomer, key = { it.customerId }) { CustomerRow(it) }
    }
}

@Composable
private fun BucketRow(row: ArAgingBucketRow) {
    KeyValueRow(
        label = stringResource(bucketLabelRes(row.label)) + " (${row.count})",
        value = formatMoney(row.total),
    )
}

@Composable
private fun CustomerRow(row: ArAgingCustomerRow) {
    KeyValueRow(
        label = "${row.customerName} — ${row.oldestDays}d",
        value = formatMoney(row.total),
    )
}

private fun bucketLabelRes(label: ArAgingBucketLabel): Int = when (label) {
    ArAgingBucketLabel.ZERO_TO_30 -> R.string.reports_ar_bucket_0_30
    ArAgingBucketLabel.THIRTY_ONE_TO_60 -> R.string.reports_ar_bucket_31_60
    ArAgingBucketLabel.SIXTY_ONE_TO_90 -> R.string.reports_ar_bucket_61_90
    ArAgingBucketLabel.NINETY_PLUS -> R.string.reports_ar_bucket_90_plus
}
