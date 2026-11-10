package dev.ishflow.android.feature.genericdoc

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.ishflow.android.R
import android.app.Activity
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.ui.platform.LocalContext
import dev.ishflow.android.appshared.models.AttachmentRecord
import dev.ishflow.android.appshared.models.DocumentRecord
import dev.ishflow.android.appshared.models.DocumentStatus
import dev.ishflow.android.appshared.models.LinkedInvoiceRef
import dev.ishflow.android.appshared.ui.AttachmentsCard
import dev.ishflow.android.appshared.ui.DocLinesCard
import dev.ishflow.android.appshared.ui.ErrorState
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
import dev.ishflow.android.appshared.R as SharedR

private val SECTION_PADDING = 16.dp
private val SECTION_GAP = 12.dp

/**
 * Generic read-only document detail used for doc kinds that don't yet have a
 * dedicated detail screen — currently `sales.payment_received` and
 * `purchases.payment_sent`. Loads the record via the same
 * `/api/mobile/documents/{type}/{id}` endpoint that powers Sales and Purchase
 * detail; renders number, date, party (customer or supplier), amount, status.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GenericDocDetailScreen(
    viewModel: GenericDocDetailViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val type = viewModel.type

    val titleRes = when (type) {
        "sales.payment_received" -> R.string.doc_detail_title_payment_received
        "purchases.payment_sent" -> R.string.doc_detail_title_payment_sent
        else -> R.string.doc_detail_title_generic
    }
    val title = (uiState as? GenericDocDetailUiState.Loaded)?.document?.number
        ?: stringResource(titleRes)
    val shell = LocalShellActions.current
    val activity = LocalContext.current as? Activity
    val snackbarHostState = remember { SnackbarHostState() }
    val pdfFailureMsg = stringResource(SharedR.string.share_pdf_failed)

    Scaffold(
        topBar = {
            AppTopBar(
                title = title,
                onAvatarClick = shell.onAvatarClick,
                onBellClick = shell.onBellClick,
                avatarInitial = shell.avatarInitial,
                notificationBadge = shell.notificationBadge,
                extraActions = {
                    val loaded = (uiState as? GenericDocDetailUiState.Loaded)
                    val kind = paperKindFor(type)
                    if (activity != null && loaded != null && loaded.document.status == DocumentStatus.POSTED && kind != null) {
                        ReceiptShareButton(
                            activity = activity,
                            document = loaded.document,
                            kind = kind,
                            currencyCode = LocalTenantCurrency.current,
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
                is GenericDocDetailUiState.Loading -> CenteredProgress()
                is GenericDocDetailUiState.Failed -> ErrorState(
                    icon = Icons.Filled.ErrorOutline,
                    title = stringResource(R.string.error_title),
                    message = stringResource(state.exception.stringRes()),
                    ctaLabel = stringResource(R.string.action_retry),
                    onCtaClick = viewModel::retry,
                )
                is GenericDocDetailUiState.Loaded -> LoadedBody(
                    document = state.document,
                    type = type,
                    attachments = state.attachments,
                    onDeleteAttachment = viewModel::deleteAttachment,
                )
            }
        }
    }
}

/**
 * Stateless content wrapper for snapshot and preview use.
 * Renders the appropriate state inside a plain [Box] (no Scaffold).
 */
@Composable
internal fun GenericDocDetailContent(
    uiState: GenericDocDetailUiState,
    type: String,
    onRetry: () -> Unit,
    onDeleteAttachment: (String) -> Unit = {},
) {
    Box(modifier = androidx.compose.ui.Modifier.fillMaxSize()) {
        when (val state = uiState) {
            is GenericDocDetailUiState.Loading -> CenteredProgress()
            is GenericDocDetailUiState.Failed -> ErrorState(
                icon = Icons.Filled.ErrorOutline,
                title = stringResource(R.string.error_title),
                message = stringResource(state.exception.stringRes()),
                ctaLabel = stringResource(R.string.action_retry),
                onCtaClick = onRetry,
            )
            is GenericDocDetailUiState.Loaded -> LoadedBody(
                document = state.document,
                type = type,
                attachments = state.attachments,
                onDeleteAttachment = onDeleteAttachment,
            )
        }
    }
}

private fun paperKindFor(type: String): PaperKind? = when (type) {
    "sales.payment_received" -> PaperKind.RECEIVE
    "purchases.payment_sent" -> PaperKind.PSENT
    else -> null
}

@Composable
private fun CenteredProgress() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}

@Composable
private fun LoadedBody(
    document: DocumentRecord,
    type: String,
    attachments: List<AttachmentRecord>,
    onDeleteAttachment: (String) -> Unit,
) {
    val kind = paperKindFor(type)
    if (kind != null && document.status == DocumentStatus.POSTED) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState()),
        ) {
            DocumentDetailContent(
                doc = document,
                kind = kind,
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
        LegacyBody(
            document = document,
            attachments = attachments,
            onDeleteAttachment = onDeleteAttachment,
        )
    }
}

@Composable
private fun LegacyBody(
    document: DocumentRecord,
    attachments: List<AttachmentRecord>,
    onDeleteAttachment: (String) -> Unit,
) {
    val formatter = remember {
        DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM)
            .withZone(ZoneId.systemDefault())
    }
    val partyName = document.customer?.name ?: document.supplier?.name ?: "—"
    val partyLabelRes = if (document.customer != null) {
        R.string.doc_detail_customer_label
    } else {
        R.string.doc_detail_supplier_label
    }
    val totalText = document.total ?: "—"

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(SECTION_PADDING),
        verticalArrangement = Arrangement.spacedBy(SECTION_GAP),
    ) {
        Card(modifier = Modifier.fillMaxWidth()) {
            ListItem(
                headlineContent = { Text(document.number) },
                supportingContent = { Text(stringResource(SharedR.string.doc_detail_subtitle_format, formatter.format(document.date), partyName)) },
                trailingContent = { StatusChip(document.status) },
            )
        }
        FieldCard(label = stringResource(partyLabelRes), value = partyName)
        FieldCard(label = stringResource(R.string.doc_detail_amount_label), value = totalText)
        if (document.linkedInvoices.isNotEmpty()) {
            LinkedInvoicesCard(invoices = document.linkedInvoices)
        }
        DocLinesCard(lines = document.items)
        if (attachments.isNotEmpty()) {
            AttachmentsCard(
                attachments = attachments,
                onDeleteAttachment = onDeleteAttachment,
            )
        }
    }
}

@Composable
private fun FieldCard(label: String, value: String) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(SECTION_PADDING)) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = value,
                style = MaterialTheme.typography.titleLarge,
            )
        }
    }
}

@Composable
private fun LinkedInvoicesCard(invoices: List<LinkedInvoiceRef>) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(SECTION_PADDING)) {
            Text(
                text = stringResource(SharedR.string.doc_detail_linked_invoices_title),
                style = MaterialTheme.typography.titleMedium,
            )
            invoices.forEachIndexed { index, inv ->
                ListItem(
                    headlineContent = { Text(inv.invoiceNumber ?: inv.invoiceId) },
                    trailingContent = { Text(inv.amount) },
                )
                if (index < invoices.lastIndex) HorizontalDivider()
            }
        }
    }
}
