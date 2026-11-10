package dev.ishflow.android.feature.sales

import android.app.Activity
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.ishflow.android.appshared.models.DocumentStatus
import dev.ishflow.android.appshared.ui.DocDetailSkeleton
import dev.ishflow.android.appshared.ui.stringRes
import dev.ishflow.android.core.ui.money.LocalTenantCurrency
import dev.ishflow.android.core.ui.receipt.DocumentDetailScroll
import dev.ishflow.android.core.ui.receipt.PaperKind
import dev.ishflow.android.core.ui.receipt.ReceiptShareButton
import dev.ishflow.android.appshared.R as SharedR

/**
 * Sales-invoice POSTED detail. Delegates rendering to the shared
 * [DocumentDetailContent] paper-receipt; the only sales-specific bits are
 * the share button (with kind = [PaperKind.SALES]) and the draft fallback.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SalesInvoiceReceiptScreen(
    @Suppress("UNUSED_PARAMETER") invoiceId: String,
    onBack: () -> Unit,
    viewModel: SalesDetailViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val topTitle = stringResource(R.string.receipt_top_title)
    val backLabel = stringResource(R.string.wizard_back)
    val activity = LocalContext.current as? Activity
    val snackbarHostState = remember { SnackbarHostState() }
    val pdfFailureMsg = stringResource(SharedR.string.share_pdf_failed)
    val currency = LocalTenantCurrency.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(topTitle) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = backLabel,
                        )
                    }
                },
                actions = {
                    val loaded = (uiState as? SalesDetailUiState.Loaded)
                    if (activity != null && loaded != null && loaded.document.status == DocumentStatus.POSTED) {
                        ReceiptShareButton(
                            activity = activity,
                            document = loaded.document,
                            kind = PaperKind.SALES,
                            currencyCode = currency,
                            failureMessage = pdfFailureMsg,
                            snackbarHostState = snackbarHostState,
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
                is SalesDetailUiState.Loading -> DocDetailSkeleton()
                is SalesDetailUiState.Failed -> Text(
                    text = stringResource(state.exception.stringRes()),
                    modifier = Modifier.padding(16.dp),
                )
                is SalesDetailUiState.Loaded -> when (state.document.status) {
                    DocumentStatus.POSTED -> DocumentDetailScroll(
                        doc = state.document,
                        kind = PaperKind.SALES,
                        currencyCode = currency,
                    )
                    else -> DraftPlaceholder(onBack = onBack)
                }
            }
        }
    }
}

@Composable
private fun DraftPlaceholder(onBack: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = stringResource(R.string.status_draft_label),
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(12.dp))
        FilledTonalButton(onClick = onBack) {
            Text(stringResource(R.string.action_continue_draft))
        }
    }
}

