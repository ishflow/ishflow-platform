package dev.ishflow.android.feature.purchases.wizard

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
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Warehouse
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import kotlinx.coroutines.launch
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.ishflow.android.core.attachments.AttachmentSection
import dev.ishflow.android.core.attachments.openAttachment
import dev.ishflow.android.core.permissions.rememberRequestCameraPermission
import dev.ishflow.android.core.pickers.ProductPickerSheet
import dev.ishflow.android.core.pickers.SupplierPickerSheet
import dev.ishflow.android.core.pickers.WarehousePickerSheet
import dev.ishflow.android.core.ui.Haptics
import dev.ishflow.android.core.ui.money.LocalTenantCurrency
import dev.ishflow.android.core.ui.money.formatMoney
import dev.ishflow.android.core.ui.wizard.WizardDashedChip
import dev.ishflow.android.core.ui.wizard.WizardDatePicker
import dev.ishflow.android.core.ui.wizard.WizardDraftChip
import dev.ishflow.android.core.ui.wizard.WizardNumberedRow
import dev.ishflow.android.core.ui.wizard.WizardStickyActionRow
import dev.ishflow.android.core.ui.wizard.WizardStickyTotalBar
import dev.ishflow.android.feature.inventory.scan.BarcodeScanScreen
import dev.ishflow.android.feature.purchases.R
import java.math.BigDecimal
import java.time.LocalDate
import java.time.format.DateTimeFormatter

private val SCREEN_GUTTER = 16.dp
private val SECTION_GAP = 12.dp
private val DATE_CHIP_FORMATTER: DateTimeFormatter = DateTimeFormatter.ofPattern("d MMM")

/**
 * Single-screen entry form for `purchases.invoice`, redesigned to share the
 * invoice-DNA chrome with [SalesWizardScreen].
 *
 * Layout (top → bottom):
 *  - TopAppBar (back, title, Draft chip, QR action)
 *  - Sticky action row [Save] tonal · [Post] filled
 *  - Sticky total bar "Itогo, N поз. — X с" (renders even when empty)
 *  - Thin divider
 *  - Scrollable: dashed chip row (Date · Warehouse · [reserved]) → numbered
 *    Supplier row → add-product action → line-item cards → note field
 *
 * Attachments are reachable from the line-card area's secondary controls
 * (carried over from the previous form layout where helpful) — kept simple
 * to match the sales wizard's "lines + bottom note" rhythm.
 *
 * Warehouse auto-selects when the tenant has exactly one (preserved from
 * [PurchaseInvoiceWizardViewModel.autoSelectWarehouseIfSingle]).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
@Suppress("LongMethod", "CyclomaticComplexMethod")
fun PurchaseInvoiceWizardScreen(
    onDone: () -> Unit,
    draftId: String = "",
    viewModel: PurchaseInvoiceWizardViewModel = hiltViewModel(),
) {
    val draft by viewModel.draft.collectAsStateWithLifecycle()
    val isPosting by viewModel.isPosting.collectAsStateWithLifecycle()
    val postResult by viewModel.postResult.collectAsStateWithLifecycle()
    val attachments by viewModel.attachments.collectAsStateWithLifecycle()
    val uploadingCount by viewModel.uploadingCount.collectAsStateWithLifecycle()
    val attachmentError by viewModel.attachmentErrors.collectAsStateWithLifecycle()
    val barcodeError by viewModel.barcodeError.collectAsStateWithLifecycle()

    var showSupplierPicker by remember { mutableStateOf(false) }
    var showWarehousePicker by remember { mutableStateOf(false) }
    var showProductPicker by remember { mutableStateOf(false) }
    var showDatePicker by remember { mutableStateOf(false) }
    var showScan by remember { mutableStateOf(false) }
    val scanSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val snackbarHostState = remember { SnackbarHostState() }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val requestCamera = rememberRequestCameraPermission()

    val postErrorLabel = stringResource(R.string.purchase_wizard_post_error)
    val barcodeErrorLabel = stringResource(R.string.purchase_wizard_barcode_not_found)
    val cameraDeniedLabel = stringResource(R.string.wizard_camera_permission_denied)
    val successHaptic = Haptics.rememberSuccessHaptic()
    val warningHaptic = Haptics.rememberWarningHaptic()

    val baseReady = draft.supplier != null && draft.warehouse != null
    val canPost = !isPosting && baseReady && draft.lines.isNotEmpty()
    val canSaveDraft = !isPosting && baseReady

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

    LaunchedEffect(postResult) {
        val result = postResult ?: return@LaunchedEffect
        if (result.isSuccess) {
            successHaptic()
            onDone()
        } else {
            val message = result.exceptionOrNull()?.localizedMessage
                ?: result.exceptionOrNull()?.message
                ?: postErrorLabel
            snackbarHostState.showSnackbar(message)
        }
    }

    LaunchedEffect(barcodeError) {
        if (barcodeError != null) {
            warningHaptic()
            snackbarHostState.showSnackbar(barcodeErrorLabel)
            viewModel.consumeBarcodeError()
        }
    }

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
                            text = stringResource(R.string.purchase_wizard_new_title),
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 1,
                        )
                        Spacer(modifier = Modifier.size(10.dp))
                        WizardDraftChip(text = stringResource(R.string.wizard_short_draft))
                    }
                },
                actions = {
                    IconButton(onClick = { showScan = true }) {
                        Icon(
                            imageVector = Icons.Filled.QrCodeScanner,
                            contentDescription = stringResource(R.string.purchase_wizard_scan_barcode),
                            tint = MaterialTheme.colorScheme.primary,
                        )
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
                    isPosting = isPosting,
                    onSaveDraft = viewModel::saveDraft,
                    onPost = viewModel::post,
                )
                WizardStickyTotalBar(
                    label = stringResource(R.string.wizard_total_items_format, draft.lines.size),
                    value = formatMoney(draft.total, LocalTenantCurrency.current),
                    dim = draft.lines.isEmpty(),
                )
                HorizontalDivider(
                    thickness = 0.5.dp,
                    color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f),
                )

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = SCREEN_GUTTER, vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(SECTION_GAP),
                ) {
                    PurchaseChipRow(
                        date = draft.date,
                        warehouseName = draft.warehouse?.name,
                        onDateClick = { showDatePicker = true },
                        onWarehouseClick = { showWarehousePicker = true },
                    )

                    WizardNumberedRow(
                        number = 1,
                        label = stringResource(R.string.purchase_detail_supplier),
                        value = draft.supplier?.name,
                        placeholder = stringResource(R.string.wizard_picker_select_short),
                        onClick = { showSupplierPicker = true },
                    )

                    AddProductButton(onClick = { showProductPicker = true })

                    if (draft.lines.isNotEmpty()) {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            draft.lines.forEach { line ->
                                PurchaseLineRow(
                                    line = line,
                                    onRemove = { viewModel.removeLine(line.id) },
                                    onUpdateQuantity = { viewModel.updateLineQuantity(line.id, it) },
                                    onUpdatePrice = { viewModel.updateLinePrice(line.id, it) },
                                )
                            }
                        }
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
                    )

                    OutlinedTextField(
                        value = draft.note,
                        onValueChange = viewModel::setNote,
                        label = { Text(stringResource(R.string.purchase_wizard_note_label)) },
                        modifier = Modifier.fillMaxWidth(),
                    )

                    Spacer(modifier = Modifier.size(16.dp))
                }
            }
            if (isPosting) {
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
    if (showWarehousePicker) {
        WarehousePickerSheet(
            onWarehouseSelected = { warehouse ->
                viewModel.setWarehouse(warehouse)
                showWarehousePicker = false
            },
            onDismiss = { showWarehousePicker = false },
        )
    }
    if (showProductPicker) {
        ProductPickerSheet(
            onProductSelected = { product ->
                viewModel.addLine(product)
                showProductPicker = false
            },
            onDismiss = { showProductPicker = false },
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
    if (showScan) {
        ModalBottomSheet(
            onDismissRequest = { showScan = false },
            sheetState = scanSheetState,
        ) {
            Box(modifier = Modifier.fillMaxWidth().fillMaxHeight(0.75f)) {
                BarcodeScanScreen(
                    onScan = { code ->
                        successHaptic()
                        viewModel.addLineByBarcode(code)
                        showScan = false
                    },
                )
            }
        }
    }
}

@Composable
private fun PurchaseChipRow(
    date: LocalDate,
    warehouseName: String?,
    onDateClick: () -> Unit,
    onWarehouseClick: () -> Unit,
) {
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
            icon = Icons.Filled.Warehouse,
            text = warehouseName ?: stringResource(R.string.wizard_chip_warehouse_empty),
            hasValue = warehouseName != null,
            modifier = Modifier.weight(1f),
            onClick = onWarehouseClick,
        )
    }
}

/**
 * Primary call-to-action for the product-lines section. Rendered as a full-
 * width tonal button so it reads as a real affordance — earlier iterations
 * used an icon+text row which read as caption noise next to the supplier row
 * and got missed on first contact.
 */
@Composable
private fun AddProductButton(onClick: () -> Unit) {
    FilledTonalButton(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp),
        shape = RoundedCornerShape(14.dp),
    ) {
        Icon(
            imageVector = Icons.Filled.Add,
            contentDescription = null,
            modifier = Modifier.size(20.dp),
        )
        Text(
            text = stringResource(R.string.purchase_wizard_add_product),
            style = MaterialTheme.typography.labelLarge,
            modifier = Modifier.padding(start = 8.dp),
        )
    }
}

@Composable
@Suppress("LongMethod")
private fun PurchaseLineRow(
    line: PurchaseLine,
    onRemove: () -> Unit,
    onUpdateQuantity: (BigDecimal) -> Unit,
    onUpdatePrice: (BigDecimal) -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
        ),
        shape = RoundedCornerShape(14.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = line.product.name,
                    style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier.weight(1f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                IconButton(onClick = onRemove) {
                    Icon(
                        imageVector = Icons.Filled.Close,
                        contentDescription = stringResource(R.string.purchase_wizard_remove_product),
                        tint = MaterialTheme.colorScheme.error.copy(alpha = 0.85f),
                    )
                }
            }

            val priceFocus = remember { FocusRequester() }
            val keyboard = LocalSoftwareKeyboardController.current
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedTextField(
                    value = line.quantity.toPlainString(),
                    onValueChange = { input ->
                        onUpdateQuantity(input.toBigDecimalOrNull() ?: BigDecimal.ZERO)
                    },
                    label = { Text(stringResource(R.string.purchase_wizard_quantity)) },
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Decimal,
                        imeAction = ImeAction.Next,
                    ),
                    keyboardActions = KeyboardActions(onNext = { priceFocus.requestFocus() }),
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                )
                OutlinedTextField(
                    value = line.price.toPlainString(),
                    onValueChange = { input ->
                        onUpdatePrice(input.toBigDecimalOrNull() ?: BigDecimal.ZERO)
                    },
                    label = { Text(stringResource(R.string.purchase_wizard_price)) },
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Decimal,
                        imeAction = ImeAction.Done,
                    ),
                    keyboardActions = KeyboardActions(onDone = { keyboard?.hide() }),
                    singleLine = true,
                    modifier = Modifier
                        .weight(1f)
                        .focusRequester(priceFocus),
                )
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = stringResource(R.string.purchase_wizard_row_total),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    text = formatMoney(line.rowTotal, LocalTenantCurrency.current),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}
