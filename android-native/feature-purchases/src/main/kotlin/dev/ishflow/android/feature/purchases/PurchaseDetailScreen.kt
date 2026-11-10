package dev.ishflow.android.feature.purchases

import android.app.Activity
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.Card
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.ishflow.android.appshared.R as SharedR
import dev.ishflow.android.appshared.models.AttachmentRecord
import dev.ishflow.android.appshared.models.DocumentRecord
import dev.ishflow.android.appshared.models.DocumentStatus
import dev.ishflow.android.appshared.ui.AttachmentsCard
import dev.ishflow.android.appshared.ui.DocDetailSkeleton
import dev.ishflow.android.appshared.ui.DocLinesCard
import dev.ishflow.android.appshared.ui.ErrorState
import dev.ishflow.android.appshared.ui.ShareButton
import dev.ishflow.android.appshared.ui.StatusChip
import dev.ishflow.android.appshared.ui.stringRes
import dev.ishflow.android.core.ui.AppTopBar
import dev.ishflow.android.core.ui.LocalShellActions
import dev.ishflow.android.core.ui.money.LocalTenantCurrency
import dev.ishflow.android.core.ui.receipt.DocumentDetailContent
import dev.ishflow.android.core.ui.receipt.PaperKind
import dev.ishflow.android.core.ui.receipt.ReceiptShareButton
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

private val SECTION_PADDING = 16.dp
private val SECTION_GAP = 12.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PurchaseDetailScreen(
    onContinueDraft: (String) -> Unit = {},
    onOpenPurchase: (String) -> Unit = {},
    viewModel: PurchaseDetailViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val isSharingPdf by viewModel.isSharingPdf.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val title = (uiState as? PurchaseDetailUiState.Loaded)?.document?.number
        ?: stringResource(R.string.purchase_detail_title)
    val chooserTitle = stringResource(SharedR.string.share_pdf_chooser_title)
    val canShare = uiState is PurchaseDetailUiState.Loaded
    val shell = LocalShellActions.current

    LaunchedEffect(viewModel) {
        viewModel.events.collect { event ->
            when (event) {
                is PurchaseDetailEvent.ClonedTo -> onOpenPurchase(event.id)
                is PurchaseDetailEvent.Posted, is PurchaseDetailEvent.Unposted -> Unit
                is PurchaseDetailEvent.Error -> snackbarHostState.showSnackbar(event.message)
            }
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            AppTopBar(
                title = title,
                onAvatarClick = shell.onAvatarClick,
                onBellClick = shell.onBellClick,
                avatarInitial = shell.avatarInitial,
                notificationBadge = shell.notificationBadge,
                extraActions = {
                    val activity = LocalContext.current as? Activity
                    val loadedDoc = (uiState as? PurchaseDetailUiState.Loaded)?.document
                    if (activity != null && loadedDoc != null && loadedDoc.status == DocumentStatus.POSTED) {
                        ReceiptShareButton(
                            activity = activity,
                            document = loadedDoc,
                            kind = PaperKind.PURCHASE,
                            currencyCode = LocalTenantCurrency.current,
                            failureMessage = stringResource(SharedR.string.share_pdf_failed),
                            snackbarHostState = snackbarHostState,
                        )
                    }
                    OverflowMenu(
                        documentStatus = loadedDoc?.status,
                        onPost = { viewModel.post() },
                        onUnpost = { viewModel.unpost() },
                        onClone = { viewModel.clone() },
                    )
                },
            )
        },
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when (val state = uiState) {
                is PurchaseDetailUiState.Loading -> DocDetailSkeleton()
                is PurchaseDetailUiState.Failed -> ErrorBody(state, onRetry = viewModel::retry)
                is PurchaseDetailUiState.Loaded -> LoadedBody(
                    document = state.document,
                    attachments = state.attachments,
                    onContinueDraft = onContinueDraft,
                    onDeleteAttachment = { viewModel.deleteAttachment(it) },
                )
            }
        }
    }
}

@Composable
private fun OverflowMenu(
    documentStatus: DocumentStatus?,
    onPost: () -> Unit,
    onUnpost: () -> Unit,
    onClone: () -> Unit,
) {
    var menuOpen by remember { mutableStateOf(false) }
    IconButton(onClick = { menuOpen = true }) {
        Icon(Icons.Default.MoreVert, contentDescription = stringResource(R.string.action_more))
    }
    DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
        if (documentStatus == DocumentStatus.DRAFT) {
            DropdownMenuItem(
                text = { Text(stringResource(R.string.action_post)) },
                onClick = { menuOpen = false; onPost() },
            )
        }
        if (documentStatus == DocumentStatus.POSTED) {
            DropdownMenuItem(
                text = { Text(stringResource(R.string.action_unpost)) },
                onClick = { menuOpen = false; onUnpost() },
            )
        }
        DropdownMenuItem(
            text = { Text(stringResource(R.string.action_clone)) },
            onClick = { menuOpen = false; onClone() },
        )
    }
}

@Composable
private fun ErrorBody(state: PurchaseDetailUiState.Failed, onRetry: () -> Unit) {
    ErrorState(
        icon = Icons.Filled.ErrorOutline,
        title = stringResource(SharedR.string.error_title),
        message = stringResource(state.exception.stringRes()),
        ctaLabel = stringResource(SharedR.string.action_retry),
        onCtaClick = onRetry,
    )
}

@Composable
private fun LoadedBody(
    document: DocumentRecord,
    attachments: List<AttachmentRecord>,
    onContinueDraft: (String) -> Unit,
    onDeleteAttachment: (String) -> Unit,
) {
    if (document.status == DocumentStatus.POSTED) {
        // POSTED → shared paper-receipt content. Attachments + draft CTA are
        // not part of the paper card — they sit BELOW the sheet so the
        // receipt itself stays a clean print-style document.
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState()),
        ) {
            DocumentDetailContent(
                doc = document,
                kind = PaperKind.PURCHASE,
                currencyCode = LocalTenantCurrency.current,
            )
            if (attachments.isNotEmpty()) {
                Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                    AttachmentsCard(
                        attachments = attachments,
                        onDeleteAttachment = onDeleteAttachment,
                    )
                }
            }
        }
    } else {
        DraftLoadedBody(
            document = document,
            attachments = attachments,
            onContinueDraft = onContinueDraft,
            onDeleteAttachment = onDeleteAttachment,
        )
    }
}

@Composable
private fun DraftLoadedBody(
    document: DocumentRecord,
    attachments: List<AttachmentRecord>,
    onContinueDraft: (String) -> Unit,
    onDeleteAttachment: (String) -> Unit,
) {
    val formatter = remember {
        DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM)
            .withZone(ZoneId.systemDefault())
    }
    val supplierName = document.supplier?.name ?: "—"
    val totalText = document.total ?: "—"

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(SECTION_PADDING),
        verticalArrangement = Arrangement.spacedBy(SECTION_GAP),
    ) {
        DocHeader(
            number = document.number,
            status = document.status,
            dateText = formatter.format(document.date),
            counterpartyName = supplierName,
        )
        SupplierCard(name = supplierName)
        DocLinesCard(lines = document.items)
        TotalsBreakdown(subtotal = totalText, tax = null, total = totalText)
        if (attachments.isNotEmpty()) {
            AttachmentsCard(
                attachments = attachments,
                onDeleteAttachment = onDeleteAttachment,
            )
        }
        StatusFooter(
            status = document.status,
            documentId = document.id,
            onContinueDraft = onContinueDraft,
        )
    }
}

@Composable
private fun DocHeader(
    number: String,
    status: DocumentStatus,
    dateText: String,
    counterpartyName: String,
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(SECTION_PADDING)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = number,
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.weight(1f),
                )
                StatusChip(status)
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = stringResource(SharedR.string.doc_detail_subtitle_format, dateText, counterpartyName),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun TotalsBreakdown(subtotal: String, tax: String?, total: String) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(SECTION_PADDING)) {
            TotalsRow(
                label = stringResource(SharedR.string.doc_detail_subtotal),
                value = subtotal,
                emphasised = false,
            )
            if (tax != null) {
                Spacer(modifier = Modifier.height(6.dp))
                TotalsRow(
                    label = stringResource(SharedR.string.doc_detail_tax),
                    value = tax,
                    emphasised = false,
                )
            }
            Spacer(modifier = Modifier.height(6.dp))
            TotalsRow(
                label = stringResource(SharedR.string.doc_detail_total_label),
                value = total,
                emphasised = true,
            )
        }
    }
}

@Composable
private fun TotalsRow(label: String, value: String, emphasised: Boolean) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            style = if (emphasised) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium,
            color = if (emphasised) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.weight(1f),
        )
        Text(
            text = value,
            style = if (emphasised) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium,
        )
    }
}

@Composable
private fun StatusFooter(
    status: DocumentStatus,
    documentId: String,
    onContinueDraft: (String) -> Unit,
) {
    when (status) {
        DocumentStatus.DRAFT -> {
            FilledTonalButton(
                onClick = { onContinueDraft(documentId) },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(R.string.action_continue_draft))
            }
        }
        else -> Unit
    }
}

@Composable
private fun SupplierCard(name: String) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(SECTION_PADDING)) {
            Text(
                text = stringResource(R.string.purchase_detail_supplier),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = name,
                style = MaterialTheme.typography.bodyLarge,
            )
        }
    }
}

