package dev.ishflow.android.feature.purchases.wizard.payment_sent

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
import dev.ishflow.android.core.pickers.SupplierPickerSheet
import dev.ishflow.android.core.ui.Haptics
import dev.ishflow.android.core.ui.money.LocalTenantCurrency
import dev.ishflow.android.core.ui.money.formatMoney
import dev.ishflow.android.core.ui.wizard.WizardDashedChip
import dev.ishflow.android.core.ui.wizard.WizardDatePicker
import dev.ishflow.android.core.ui.wizard.WizardDraftChip
import dev.ishflow.android.core.ui.wizard.WizardNumberedRow
import dev.ishflow.android.core.ui.wizard.WizardStickyActionRow
import dev.ishflow.android.core.ui.wizard.WizardStickyTotalBar
import dev.ishflow.android.feature.purchases.R
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import kotlinx.coroutines.launch

private val SCREEN_GUTTER = 16.dp
private val SECTION_GAP = 14.dp
private val DATE_CHIP_FORMATTER: DateTimeFormatter = DateTimeFormatter.ofPattern("d MMM")

/**
 * Top-level Compose entry point for the `purchases.payment_sent` wizard.
 *
 * Mirror of `PaymentReceivedWizardScreen` with a supplier picker instead of
 * a customer picker. Same invoice-DNA chrome (sticky actions + total bar +
 * dashed chips + numbered row + open-invoices section). The "Способ" and
 * "Касса" chips render disabled today and become active when the cashbox
 * feature lands; until then they communicate that the slot exists.
 *
 * AttachmentSection (scan + library + delete + preview) is added after the
 * open-invoices section and before the trailing spacer.
 *
 * Posted draft fields and VM API are unchanged.
 */
@Composable
fun PaymentSentWizardScreenRoute(
    onDone: () -> Unit,
    prefillRelatedInvoiceId: String? = null,
    viewModel: PaymentSentWizardViewModel = hiltViewModel(),
) {
    LaunchedEffect(prefillRelatedInvoiceId) {
        viewModel.setRelatedInvoice(prefillRelatedInvoiceId)
    }
    PaymentSentWizardScreen(onDone = onDone, viewModel = viewModel)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
@Suppress("LongMethod", "CyclomaticComplexMethod")
fun PaymentSentWizardScreen(onDone: () -> Unit, viewModel: PaymentSentWizardViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val selectedSupplier by viewModel.selectedSupplier.collectAsStateWithLifecycle()
    val openInvoices by viewModel.openInvoices.collectAsStateWithLifecycle()
    var showSupplierPicker by remember { mutableStateOf(false) }
    var showDatePicker by remember { mutableStateOf(false) }
    var saveWithoutLinking by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }
    val errorLabel = stringResource(R.string.payment_sent_post_error)
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
            is PaymentSentUiState.Failed -> {
                val message = state.exception.localizedMessage
                    ?: state.exception.message
                    ?: errorLabel
                snackbarHostState.showSnackbar(message)
                viewModel.retry()
            }
            is PaymentSentUiState.Success -> {
                successHaptic()
                onDone()
            }
            is PaymentSentUiState.Editing,
            is PaymentSentUiState.Submitting,
            -> Unit
        }
    }

    val draft = draftOf(uiState)
    val isSubmitting = uiState is PaymentSentUiState.Submitting
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
                            text = stringResource(R.string.payment_sent_wizard_title),
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
                    onSaveDraft = viewModel::post,
                    onPost = viewModel::post,
                )
                WizardStickyTotalBar(
                    label = stringResource(R.string.payment_sent_total_label),
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
                            label = stringResource(R.string.wizard_recipient_label),
                            value = selectedSupplier?.name,
                            placeholder = stringResource(R.string.wizard_picker_select_short),
                            onClick = { showSupplierPicker = true },
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

    if (showSupplierPicker) {
        SupplierPickerSheet(
            onSupplierSelected = { supplier ->
                viewModel.setSupplier(supplier)
                showSupplierPicker = false
            },
            onDismiss = { showSupplierPicker = false },
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

private fun draftOf(state: PaymentSentUiState): PaymentSentDraft = when (state) {
    is PaymentSentUiState.Editing -> state.draft
    is PaymentSentUiState.Submitting -> state.draft
    is PaymentSentUiState.Failed -> state.draft
    is PaymentSentUiState.Success -> PaymentSentDraft()
}

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
        label = { Text(stringResource(R.string.payment_sent_field_amount)) },
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
        label = { Text(stringResource(R.string.purchase_wizard_note_label)) },
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
private fun RelatedInvoiceField(invoiceId: String) {
    OutlinedTextField(
        value = invoiceId,
        onValueChange = { },
        readOnly = true,
        label = { Text(stringResource(R.string.payment_sent_field_related_invoice)) },
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = SCREEN_GUTTER, vertical = 4.dp),
    )
}

private val EPSILON: BigDecimal = BigDecimal("0.01")

private fun canSubmitLinkedInvoices(
    draft: PaymentSentDraft,
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
