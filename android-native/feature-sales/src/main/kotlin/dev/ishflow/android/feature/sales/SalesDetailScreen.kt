package dev.ishflow.android.feature.sales

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
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
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
import dev.ishflow.android.core.ui.AppLargeTopBar
import dev.ishflow.android.core.ui.LocalShellActions
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import dev.ishflow.android.appshared.R as SharedR

private val SECTION_PADDING = 16.dp
private val SECTION_GAP = 12.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SalesDetailScreen(
    onContinueDraft: (String) -> Unit = {},
    onOpenSales: (String) -> Unit = {},
    viewModel: SalesDetailViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val isSharingPdf by viewModel.isSharingPdf.collectAsStateWithLifecycle()
    val scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()
    val snackbarHostState = remember { SnackbarHostState() }

    val title = when (val state = uiState) {
        is SalesDetailUiState.Loaded -> state.document.number
        else -> stringResource(R.string.sales_detail_title)
    }
    val chooserTitle = stringResource(SharedR.string.share_pdf_chooser_title)
    val canShare = uiState is SalesDetailUiState.Loaded
    val shell = LocalShellActions.current

    LaunchedEffect(viewModel) {
        viewModel.events.collect { event ->
            when (event) {
                is SalesDetailEvent.ClonedTo -> onOpenSales(event.id)
                is SalesDetailEvent.Posted, is SalesDetailEvent.Unposted -> Unit
                is SalesDetailEvent.Error -> snackbarHostState.showSnackbar(event.message)
            }
        }
    }

    Scaffold(
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            AppLargeTopBar(
                title = title,
                onAvatarClick = shell.onAvatarClick,
                onBellClick = shell.onBellClick,
                avatarInitial = shell.avatarInitial,
                notificationBadge = shell.notificationBadge,
                scrollBehavior = scrollBehavior,
                extraActions = {
                    if (canShare) {
                        ShareButton(
                            isLoading = isSharingPdf,
                            onClick = { viewModel.sharePdf(chooserTitle) },
                        )
                    }
                    val loadedDoc = (uiState as? SalesDetailUiState.Loaded)?.document
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
                is SalesDetailUiState.Loading -> DocDetailSkeleton()
                is SalesDetailUiState.Failed -> ErrorBody(state)
                is SalesDetailUiState.Loaded -> LoadedBody(
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
private fun ErrorBody(state: SalesDetailUiState.Failed) {
    ErrorState(
        icon = Icons.Filled.ErrorOutline,
        title = stringResource(SharedR.string.error_title),
        message = stringResource(state.exception.stringRes()),
        ctaLabel = stringResource(SharedR.string.action_retry),
        onCtaClick = { /* no-op for detail screen */ },
    )
}

@Composable
private fun LoadedBody(
    document: DocumentRecord,
    attachments: List<AttachmentRecord>,
    onContinueDraft: (String) -> Unit,
    onDeleteAttachment: (String) -> Unit,
) {
    val formatter = remember {
        DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM)
            .withZone(ZoneId.systemDefault())
    }
    val customerName = document.customer?.name ?: "—"
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
            counterpartyName = customerName,
        )
        CustomerCard(name = customerName)
        DocLinesCard(lines = document.items)
        // DocumentRecord exposes only a single `total` — render Subtotal = Total,
        // hide Tax (no field), Total = Total. Payment summary intentionally
        // omitted (DocumentRecord has no paid / outstanding fields yet).
        TotalsBreakdown(subtotal = totalText, tax = null, total = totalText)
        if (attachments.isNotEmpty()) {
            AttachmentsCard(
                attachments = attachments,
                onDeleteAttachment = onDeleteAttachment,
            )
        }
        StatusFooter(status = document.status, documentId = document.id, onContinueDraft = onContinueDraft)
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
private fun CustomerCard(name: String) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(SECTION_PADDING)) {
            Text(
                text = stringResource(R.string.sales_detail_customer),
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

@Composable
private fun StatusFooter(
    status: DocumentStatus,
    documentId: String,
    onContinueDraft: (String) -> Unit,
) {
    when (status) {
        DocumentStatus.POSTED -> {
            Box(
                modifier = Modifier.fillMaxWidth(),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = stringResource(R.string.status_posted_label),
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
        }

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
