package dev.ishflow.android.feature.sales.wizard.payment_received

import android.app.Activity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Savings
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.ishflow.android.appshared.models.CatalogRecord
import dev.ishflow.android.core.attachments.AttachmentSection
import dev.ishflow.android.core.attachments.openAttachment
import dev.ishflow.android.core.permissions.rememberRequestCameraPermission
import dev.ishflow.android.core.pickers.CustomerPickerSheet
import dev.ishflow.android.core.ui.Haptics
import dev.ishflow.android.core.ui.money.LocalTenantCurrency
import dev.ishflow.android.core.ui.money.formatMoney
import dev.ishflow.android.core.ui.wizard.WizardDashedChip
import dev.ishflow.android.core.ui.wizard.WizardDatePicker
import dev.ishflow.android.core.ui.wizard.WizardDraftChip
import dev.ishflow.android.core.ui.wizard.WizardNumberedRow
import dev.ishflow.android.core.ui.wizard.WizardStickyActionRow
import dev.ishflow.android.core.ui.wizard.WizardStickyTotalBar
import dev.ishflow.android.feature.sales.R
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import kotlinx.coroutines.launch

private val SCREEN_GUTTER = 16.dp
private val SECTION_GAP = 14.dp
private val DATE_CHIP_FORMATTER: DateTimeFormatter = DateTimeFormatter.ofPattern("d MMM")

/**
 * Top-level Compose entry point for the `sales.payment_received` wizard.
 *
 * Layout shares the invoice-DNA chrome with [SalesWizardScreen]:
 *  - TopAppBar with title + "Черн." draft chip
 *  - Sticky action row (Save tonal + Post filled)
 *  - Sticky total bar — renders the entered amount (dim when zero)
 *  - Dashed chip row (Date · Способ disabled · Касса disabled) — the last
 *    two pickers are reserved for a future cash-method / cashbox feature
 *    and render as muted, non-interactive placeholders today
 *  - Numbered Counterparty row (picker)
 *  - Inline Amount field + Comment field
 *  - Open-invoices allocation section (preserved from prior version)
 *  - AttachmentSection (scan + library + delete + preview)
 *
 * Posted draft fields and VM API are unchanged; only the visual surface and
 * order are reorganised. See the internal design mockup
 * variant A for the canonical mock.
 */
@Composable
fun PaymentReceivedWizardScreenRoute(
    onDone: () -> Unit,
    prefillRelatedInvoiceId: String? = null,
    viewModel: PaymentReceivedWizardViewModel = hiltViewModel(),
) {
    LaunchedEffect(prefillRelatedInvoiceId) {
        viewModel.setRelatedInvoice(prefillRelatedInvoiceId)
    }
    PaymentReceivedWizardScreen(onDone = onDone, viewModel = viewModel)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
@Suppress("LongMethod", "CyclomaticComplexMethod")
fun PaymentReceivedWizardScreen(onDone: () -> Unit, viewModel: PaymentReceivedWizardViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val selectedCustomer by viewModel.selectedCustomer.collectAsStateWithLifecycle()
    val openInvoices by viewModel.openInvoices.collectAsStateWithLifecycle()
    var showCustomerPicker by remember { mutableStateOf(false) }
    var showDatePicker by remember { mutableStateOf(false) }
    var saveWithoutLinking by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }
    val errorLabel = stringResource(R.string.payment_received_post_error)
    val successHaptic = Haptics.rememberSuccessHaptic()

    val context = LocalContext.current
    val attachments by viewModel.attachments.collectAsStateWithLifecycle()
    val uploadingCount by viewModel.uploadingCount.collectAsStateWithLifecycle()
    val attachmentError by viewModel.attachmentErrors.collectAsStateWithLifecycle()
    val cameraDeniedLabel = stringResource(R.string.wizard_camera_permission_denied)
    val scope = rememberCoroutineScope()
    val requestCamera = rememberRequestCameraPermission()

    val pickFileLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.PickVisualMedia(),
    ) { uri -> if (uri != null) viewModel.attach(uri) }

    val scanLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.StartIntentSenderForResult(),
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            viewModel.handleScanResult(result.data)
        }
    }

    LaunchedEffect(Unit) {
        viewModel.scanIntents.collect { sender ->
            scanLauncher.launch(IntentSenderRequest.Builder(sender).build())
        }
    }

    LaunchedEffect(attachmentError) {
        attachmentError?.let { msg ->
            snackbarHostState.showSnackbar(msg)
            viewModel.clearAttachmentError()
        }
    }

    LaunchedEffect(uiState) {
        when (val state = uiState) {
            is PaymentReceivedUiState.Failed -> {
                val message = state.exception.localizedMessage
                    ?: state.exception.message
                    ?: errorLabel
                snackbarHostState.showSnackbar(message)
                viewModel.retry()
            }
            is PaymentReceivedUiState.Success -> {
                successHaptic()
                onDone()
            }
            is PaymentReceivedUiState.Editing,
            is PaymentReceivedUiState.Submitting,
            -> Unit
        }
    }

    val draft = draftOf(uiState)
    val isSubmitting = uiState is PaymentReceivedUiState.Submitting
    val canPost = !isSubmitting &&
        draft.isPostable() &&
        canSubmitLinkedInvoices(draft, openInvoices, saveWithoutLinking)
    val canSaveDraft = !isSubmitting && draft.isPostable()

    Scaffold(
        topBar = {
            TopAppBar(
                navigationIcon = {
                    IconButton(onClick = onDone) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = stringResource(R.string.payment_received_wizard_title),
                            fontSize = 16.sp,
                        )
                        Spacer(modifier = Modifier.size(10.dp))
                        WizardDraftChip(text = stringResource(R.string.wizard_short_draft))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .imePadding(),
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                WizardStickyActionRow(
                    saveLabel = stringResource(R.string.wizard_save_short),
                    postLabel = stringResource(R.string.wizard_post_short),
                    canSaveDraft = canSaveDraft,
                    canPost = canPost,
                    isPosting = isSubmitting,
                    onSaveDraft = viewModel::saveDraft,
                    onPost = viewModel::post,
                )
                WizardStickyTotalBar(
                    label = stringResource(R.string.payment_received_total_label),
                    value = formatMoney(draft.amount, LocalTenantCurrency.current),
                    dim = draft.amount.signum() == 0,
                )
                HorizontalDivider(
                    thickness = 0.5.dp,
                    color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f),
                )

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(0.dp),
                ) {
                    Column(
                        modifier = Modifier.padding(horizontal = SCREEN_GUTTER, vertical = 12.dp),
                        verticalArrangement = Arrangement.spacedBy(SECTION_GAP),
                    ) {
                        PaymentChipRow(
                            date = draft.date,
                            onDateClick = { showDatePicker = true },
                        )

                        WizardNumberedRow(
                            number = 1,
                            label = stringResource(R.string.wizard_counterparty_label),
                            value = selectedCustomer?.name,
                            placeholder = stringResource(R.string.wizard_picker_select_short),
                            onClick = { showCustomerPicker = true },
                        )

                        AmountField(
                            amount = draft.amount,
                            onAmountChange = viewModel::setAmount,
                        )

                        NoteField(
                            note = draft.note.orEmpty(),
                            onNoteChange = viewModel::setNote,
                        )
                    }

                    OpenInvoicesSection(
                        state = openInvoices,
                        paymentAmount = draft.amount,
                        saveWithoutLinking = saveWithoutLinking,
                        onSaveWithoutLinkingChange = { saveWithoutLinking = it },
                        onToggle = viewModel::toggleInvoiceSelection,
                        onAllocationChange = viewModel::setInvoiceAllocation,
                    )

                    if (draft.relatedInvoiceId != null && openInvoices !is OpenInvoicesUiState.Loaded) {
                        RelatedInvoiceField(invoiceId = draft.relatedInvoiceId)
                    }

                    AttachmentSection(
                        attachments = attachments,
                        uploadingCount = uploadingCount,
                        onScanClick = {
                            requestCamera(
                                { viewModel.openScanner(context as Activity) },
                                { scope.launch { snackbarHostState.showSnackbar(cameraDeniedLabel) } },
                            )
                        },
                        onPickFromLibrary = {
                            pickFileLauncher.launch(
                                PickVisualMediaRequest(
                                    mediaType = ActivityResultContracts.PickVisualMedia.ImageAndVideo,
                                ),
                            )
                        },
                        onPreview = { meta -> openAttachment(context, meta) },
                        onDelete = { meta -> viewModel.detach(meta.id) },
                        modifier = Modifier.padding(horizontal = SCREEN_GUTTER),
                    )

                    Spacer(modifier = Modifier.size(24.dp))
                }
            }

            if (isSubmitting) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            }
        }
    }

    if (showCustomerPicker) {
        CustomerPickerSheet(
            onCustomerSelected = { customer ->
                viewModel.setCustomer(customer)
                showCustomerPicker = false
            },
            onDismiss = { showCustomerPicker = false },
        )
    }
    if (showDatePicker) {
        WizardDatePicker(
            initial = draft.date,
            onConfirm = { picked ->
                viewModel.setDate(picked)
                showDatePicker = false
            },
            onDismiss = { showDatePicker = false },
        )
    }
}

private fun draftOf(state: PaymentReceivedUiState): PaymentReceivedDraft = when (state) {
    is PaymentReceivedUiState.Editing -> state.draft
    is PaymentReceivedUiState.Submitting -> state.draft
    is PaymentReceivedUiState.Failed -> state.draft
    is PaymentReceivedUiState.Success -> PaymentReceivedDraft()
}

/**
 * Three-chip header row: Date (active) · Способ (disabled placeholder) ·
 * Касса (disabled placeholder).
 *
 * The last two chips are rendered with `enabled = false` so they appear in
 * the design system as muted but visible affordances — signalling to the
 * user that the feature exists structurally but is not yet wired up.
 * When the cash-method / cashbox feature ships, the chips simply gain
 * click handlers and live values without any layout changes.
 */
@Composable
private fun PaymentChipRow(date: LocalDate, onDateClick: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        WizardDashedChip(
            icon = Icons.Filled.CalendarToday,
            text = DATE_CHIP_FORMATTER.format(date),
            hasValue = true,
            modifier = Modifier.weight(1f, fill = false),
            onClick = onDateClick,
        )
        WizardDashedChip(
            icon = Icons.Filled.Payments,
            text = stringResource(R.string.wizard_chip_method_empty),
            hasValue = false,
            enabled = false,
            modifier = Modifier.weight(1f),
            onClick = {},
        )
        WizardDashedChip(
            icon = Icons.Filled.Savings,
            text = stringResource(R.string.wizard_chip_cashbox_empty),
            hasValue = false,
            enabled = false,
            modifier = Modifier.weight(1f),
            onClick = {},
        )
    }
}

@Composable
private fun AmountField(amount: BigDecimal, onAmountChange: (BigDecimal) -> Unit) {
    var rawText by remember(amount) {
        mutableStateOf(if (amount.signum() == 0) "" else amount.toPlainString())
    }
    val keyboard = LocalSoftwareKeyboardController.current
    OutlinedTextField(
        value = rawText,
        onValueChange = { input ->
            rawText = input
            val parsed = input.toBigDecimalOrNull() ?: BigDecimal.ZERO
            onAmountChange(parsed)
        },
        label = { Text(stringResource(R.string.payment_received_field_amount)) },
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.Decimal,
            imeAction = ImeAction.Done,
        ),
        keyboardActions = KeyboardActions(onDone = { keyboard?.hide() }),
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
private fun NoteField(note: String, onNoteChange: (String?) -> Unit) {
    OutlinedTextField(
        value = note,
        onValueChange = { onNoteChange(it) },
        label = { Text(stringResource(R.string.payment_received_field_note)) },
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
private fun RelatedInvoiceField(invoiceId: String) {
    OutlinedTextField(
        value = invoiceId,
        onValueChange = { },
        readOnly = true,
        label = { Text(stringResource(R.string.payment_received_field_related_invoice)) },
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = SCREEN_GUTTER, vertical = 4.dp),
    )
}

/**
 * Save-button gate. Allows posting EITHER with no links (when no rows or
 * with explicit "save without linking" toggle) OR with links summing to
 * the wizard amount within $0.01.
 */
private val EPSILON: BigDecimal = BigDecimal("0.01")

private fun canSubmitLinkedInvoices(
    draft: PaymentReceivedDraft,
    state: OpenInvoicesUiState,
    saveWithoutLinking: Boolean,
): Boolean {
    if (draft.linkedInvoices.isEmpty()) {
        val hasOpenRows = state is OpenInvoicesUiState.Loaded && state.rows.isNotEmpty()
        return !hasOpenRows || saveWithoutLinking
    }
    val sum = draft.linkedInvoices.fold(BigDecimal.ZERO) { acc, link -> acc + link.amount }
    return (sum - draft.amount).abs() <= EPSILON
}

@Composable
@Suppress("LongParameterList")
private fun OpenInvoicesSection(
    state: OpenInvoicesUiState,
    paymentAmount: BigDecimal,
    saveWithoutLinking: Boolean,
    onSaveWithoutLinkingChange: (Boolean) -> Unit,
    onToggle: (String) -> Unit,
    onAllocationChange: (String, BigDecimal) -> Unit,
) {
    when (state) {
        OpenInvoicesUiState.Idle,
        OpenInvoicesUiState.Loading,
        is OpenInvoicesUiState.Failed,
        -> Unit
        is OpenInvoicesUiState.Loaded -> OpenInvoicesLoaded(
            rows = state.rows,
            paymentAmount = paymentAmount,
            saveWithoutLinking = saveWithoutLinking,
            onSaveWithoutLinkingChange = onSaveWithoutLinkingChange,
            onToggle = onToggle,
            onAllocationChange = onAllocationChange,
        )
    }
}

@Composable
@Suppress("LongParameterList")
private fun OpenInvoicesLoaded(
    rows: List<OpenInvoiceRowState>,
    paymentAmount: BigDecimal,
    saveWithoutLinking: Boolean,
    onSaveWithoutLinkingChange: (Boolean) -> Unit,
    onToggle: (String) -> Unit,
    onAllocationChange: (String, BigDecimal) -> Unit,
) {
    Column(modifier = Modifier.padding(horizontal = SCREEN_GUTTER)) {
        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
        Text(
            text = stringResource(R.string.payment_open_invoices_title),
            style = MaterialTheme.typography.titleSmall,
            modifier = Modifier.padding(bottom = 8.dp),
        )
        if (rows.isEmpty()) {
            Text(
                text = stringResource(R.string.payment_open_invoices_empty),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = SECTION_GAP),
            )
            SaveWithoutLinkingToggle(
                checked = saveWithoutLinking,
                onCheckedChange = onSaveWithoutLinkingChange,
            )
            return
        }
        rows.forEach { row ->
            OpenInvoiceRow(
                row = row,
                onToggle = { onToggle(row.item.invoiceId) },
                onAllocationChange = { onAllocationChange(row.item.invoiceId, it) },
            )
        }
        DistributionSummary(rows = rows, paymentAmount = paymentAmount)
        SaveWithoutLinkingToggle(
            checked = saveWithoutLinking,
            onCheckedChange = onSaveWithoutLinkingChange,
        )
    }
}

@Composable
private fun OpenInvoiceRow(
    row: OpenInvoiceRowState,
    onToggle: () -> Unit,
    onAllocationChange: (BigDecimal) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Checkbox(checked = row.selected, onCheckedChange = { onToggle() })
        Column(modifier = Modifier.weight(1f)) {
            Text(text = row.item.invoiceNumber, style = MaterialTheme.typography.bodyMedium)
            Text(
                text = stringResource(
                    R.string.payment_invoice_row_open_amount_format,
                    row.item.openAmount.toPlainString(),
                ),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        if (row.selected) {
            AllocationField(
                allocated = row.allocated,
                onAllocationChange = onAllocationChange,
            )
        }
    }
}

@Composable
private fun AllocationField(allocated: BigDecimal, onAllocationChange: (BigDecimal) -> Unit) {
    var rawText by remember(allocated) {
        mutableStateOf(if (allocated.signum() == 0) "" else allocated.toPlainString())
    }
    OutlinedTextField(
        value = rawText,
        onValueChange = { input ->
            rawText = input
            val parsed = input.toBigDecimalOrNull() ?: BigDecimal.ZERO
            onAllocationChange(parsed)
        },
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.Decimal,
            imeAction = ImeAction.Done,
        ),
        singleLine = true,
        modifier = Modifier.width(120.dp),
    )
}

@Composable
private fun DistributionSummary(rows: List<OpenInvoiceRowState>, paymentAmount: BigDecimal) {
    val allocated = rows
        .filter { it.selected }
        .fold(BigDecimal.ZERO) { acc, r -> acc + r.allocated }
    val remaining = (paymentAmount - allocated).setScale(2, RoundingMode.HALF_UP)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            text = stringResource(
                R.string.payment_open_invoices_distribution_format,
                allocated.setScale(2, RoundingMode.HALF_UP).toPlainString(),
                paymentAmount.setScale(2, RoundingMode.HALF_UP).toPlainString(),
            ),
            style = MaterialTheme.typography.bodyMedium,
        )
        Text(
            text = "${stringResource(R.string.payment_open_invoices_remaining_label)}: ${remaining.toPlainString()}",
            style = MaterialTheme.typography.bodyMedium,
            color = if (remaining.signum() == 0) {
                MaterialTheme.colorScheme.primary
            } else {
                MaterialTheme.colorScheme.error
            },
        )
    }
}

@Composable
private fun SaveWithoutLinkingToggle(checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Checkbox(checked = checked, onCheckedChange = onCheckedChange)
        Text(
            text = stringResource(R.string.payment_open_invoices_save_without_linking),
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(start = 8.dp),
        )
    }
}
