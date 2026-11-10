package dev.ishflow.android.feature.settings.billing

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SuggestionChip
import androidx.compose.material3.SuggestionChipDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.IconButton
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.ishflow.android.appshared.models.BillingResponse
import dev.ishflow.android.appshared.ui.ErrorState
import dev.ishflow.android.feature.settings.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BillingScreen(
    onBack: () -> Unit,
    viewModel: BillingViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val context = LocalContext.current

    LaunchedEffect(viewModel.events) {
        viewModel.events.collect { event ->
            when (event) {
                is BillingEvent.OpenPortal -> {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(event.url))
                    context.startActivity(intent)
                }
                is BillingEvent.Error -> {
                    snackbarHostState.showSnackbar(event.message)
                }
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.billing_title)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.action_back),
                        )
                    }
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when (val state = uiState) {
                is BillingUiState.Loading -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }
                is BillingUiState.Failed -> {
                    ErrorState(
                        title = stringResource(R.string.action_retry),
                        message = state.message,
                        ctaLabel = stringResource(R.string.action_retry),
                        onCtaClick = viewModel::refresh,
                    )
                }
                is BillingUiState.Loaded -> {
                    BillingContent(
                        billing = state.billing,
                        onOpenPortal = viewModel::openPortal,
                    )
                }
            }
        }
    }
}

@Composable
internal fun BillingContent(
    billing: BillingResponse,
    onOpenPortal: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 24.dp, vertical = 16.dp),
    ) {
        // Plan name
        Text(
            text = stringResource(R.string.billing_plan_label),
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            text = billing.plan.replaceFirstChar { it.uppercase() },
            style = MaterialTheme.typography.headlineMedium,
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Status chip
        val (statusLabel, chipColor) = billingStatusLabel(billing.status)
        SuggestionChip(
            onClick = {},
            label = { Text(statusLabel) },
            colors = SuggestionChipDefaults.suggestionChipColors(
                containerColor = chipColor,
            ),
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Trial banner
        val trialEnd = billing.trialEnd
        if (billing.status == "trialing" && trialEnd != null) {
            Text(
                text = "${stringResource(R.string.billing_trial_end_label)}: ${formatDate(trialEnd)}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.secondary,
            )
            Spacer(modifier = Modifier.height(8.dp))
        }

        Spacer(modifier = Modifier.weight(1f))

        // Portal button
        FilledTonalButton(
            onClick = onOpenPortal,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(stringResource(R.string.billing_open_portal))
        }
    }
}

@Composable
private fun billingStatusLabel(status: String): Pair<String, androidx.compose.ui.graphics.Color> {
    return when (status) {
        "trialing" -> Pair(
            stringResource(R.string.billing_status_trial),
            // Brand has no tertiary; secondaryContainer (light-blue) keeps
            // the trial pill on-palette and visually distinct from primary.
            MaterialTheme.colorScheme.secondaryContainer,
        )
        "active" -> Pair(
            stringResource(R.string.billing_status_active),
            MaterialTheme.colorScheme.primaryContainer,
        )
        "past_due" -> Pair(
            stringResource(R.string.billing_status_past_due),
            MaterialTheme.colorScheme.errorContainer,
        )
        "cancelled" -> Pair(
            stringResource(R.string.billing_status_canceled),
            MaterialTheme.colorScheme.surfaceVariant,
        )
        else -> Pair(status, MaterialTheme.colorScheme.surfaceVariant)
    }
}

/**
 * Formats an ISO-8601 date string to a short locale date.
 * Parses only the date portion to avoid time-zone edge cases.
 */
private fun formatDate(iso: String): String {
    return try {
        val date = java.time.LocalDate.parse(iso.take(10))
        date.format(java.time.format.DateTimeFormatter.ofLocalizedDate(java.time.format.FormatStyle.MEDIUM))
    } catch (_: Exception) {
        iso.take(10)
    }
}
