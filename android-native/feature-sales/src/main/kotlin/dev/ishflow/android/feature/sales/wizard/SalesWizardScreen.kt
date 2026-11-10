package dev.ishflow.android.feature.sales.wizard

import android.app.Activity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Sell
import androidx.compose.material.icons.filled.Warehouse
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.ishflow.android.appshared.api.toApiException
import dev.ishflow.android.appshared.models.CatalogRecord
import dev.ishflow.android.appshared.ui.serverMessage
import dev.ishflow.android.appshared.ui.stringRes
import dev.ishflow.android.core.attachments.AttachmentSection
import dev.ishflow.android.core.attachments.openAttachment
import dev.ishflow.android.core.permissions.rememberRequestCameraPermission
import dev.ishflow.android.core.pickers.CustomerPickerSheet
import dev.ishflow.android.core.pickers.PriceTypePickerSheet
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
import dev.ishflow.android.feature.sales.R
import java.math.BigDecimal
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import kotlinx.coroutines.launch

private val SCREEN_GUTTER = 16.dp
private val SECTION_GAP = 12.dp
private val DATE_CHIP_FORMATTER: DateTimeFormatter =
    DateTimeFormatter.ofPattern("d MMM")

/**
 * Single-screen sales-invoice entry, redesigned for fast 1C-style data entry.
 *
 * Layout top → bottom:
 *  - TopAppBar (back, title "Новая накладная", "Черн." chip, QR action)
 *  - STICKY action row [Сохранить] tonal · [Провести] filled
 *  - STICKY total bar "Итого, N поз. — X с" (renders even when empty)
 *  - Thin divider
 *  - SCROLLABLE: dashed chip row (Дата · Тип цены · Склад) → numbered
 *    Контрагент row → inline product search → line items list
 *
 * Tapping a product in the search dropdown opens [InlineProductLineDialog]
 * pre-filled with qty=1 and salePrice. The same dialog handles edits via
 * the ✎ icon on each line. Warehouse auto-selects when the tenant has
 * exactly one (existing VM bootstrap).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
@Suppress("LongMethod")
fun SalesWizardScreen(
    onDone: () -> Unit,
    draftId: String = "",
    viewModel: SalesWizardViewModel = hiltViewModel(),
) {
    val draft by viewModel.draft.collectAsStateWithLifecycle()
    val isPosting by viewModel.isPosting.collectAsStateWithLifecycle()
    val postResult by viewModel.postResult.collectAsStateWithLifecycle()
    val barcodeError by viewModel.barcodeError.collectAsStateWithLifecycle()
    val stockByProduct by viewModel.stockByProduct.collectAsStateWithLifecycle()
    val missingFields by viewModel.missingFields.collectAsStateWithLifecycle()
    val currency = LocalTenantCurrency.current

    var showCustomerPicker by remember { mutableStateOf(false) }
    var showWarehousePicker by remember { mutableStateOf(false) }
    var showPriceTypePicker by remember { mutableStateOf(false) }
    var showDatePicker by remember { mutableStateOf(false) }
    var showScan by remember { mutableStateOf(false) }
    // Hoisted dialog state: null = closed; Add(product) for new line; Edit(line) for ✎ tap.
    var dialogState by remember { mutableStateOf<ProductLineDialogMode?>(null) }
    // The full CatalogRecord behind the open dialog. ProductLineDialogMode only
    // carries display fields; we need the record on save so the ViewModel can
    // attach product id + drive stock fetch.
    var pickedProduct by remember { mutableStateOf<CatalogRecord?>(null) }

    val scanSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val snackbarHostState = remember { SnackbarHostState() }
    val errorLabel = stringResource(R.string.wizard_post_error)
    val barcodeErrorLabel = stringResource(R.string.wizard_barcode_not_found)
    // baseReady gates Сохранить. Customer is the only required-and-not-auto field;
    // warehouse auto-fills when the tenant has exactly one (VM bootstrap).
    val baseReady = draft.customer != null
    val canPost = !isPosting && baseReady && draft.lines.isNotEmpty()
    val canSaveDraft = !isPosting && baseReady
    val successHaptic = Haptics.rememberSuccessHaptic()
    val warningHaptic = Haptics.rememberWarningHaptic()
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

    LaunchedEffect(postResult) {
        val result = postResult ?: return@LaunchedEffect
        if (result.isSuccess) {
            successHaptic()
            onDone()
        } else {
            val apiEx = result.exceptionOrNull()?.toApiException()
            val message = apiEx?.serverMessage()
                ?: apiEx?.let { context.getString(it.stringRes()) }
                ?: errorLabel
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
                            text = stringResource(R.string.wizard_invoice_form_title),
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
                            contentDescription = stringResource(R.string.wizard_scan_barcode),
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
                if (draftId.isNotBlank()) {
                    DraftResumeHint()
                }
                WizardStickyTotalBar(
                    label = stringResource(R.string.wizard_total_items_format, draft.lines.size),
                    value = formatMoney(totalOf(draft.lines), currency),
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
                    DashedChipRow(
                        date = draft.date,
                        priceTypeName = draft.priceType?.name,
                        warehouseName = draft.warehouse?.name,
                        warehouseError = MissingField.WAREHOUSE in missingFields,
                        onDateClick = { showDatePicker = true },
                        onPriceTypeClick = { showPriceTypePicker = true },
                        onWarehouseClick = { showWarehousePicker = true },
                    )
                    WizardNumberedRow(
                        number = 1,
                        label = stringResource(R.string.wizard_counterparty_label),
                        value = draft.customer?.name,
                        placeholder = stringResource(R.string.wizard_picker_select_short),
                        onClick = { showCustomerPicker = true },
                    )
                    InlineProductSearch(
                        warehouseId = draft.warehouse?.id,
                        priceTypeId = draft.priceType?.id,
                        onProductPicked = { product, resolvedPrice ->
                            pickedProduct = product
                            dialogState = ProductLineDialogMode.Add(
                                productName = product.name,
                                productCode = product.code,
                                initialPrice = resolvedPrice,
                            )
                        },
                    )
                    if (draft.lines.isNotEmpty()) {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            draft.lines.forEach { line ->
                                LineItemRow(
                                    line = line,
                                    stock = stockByProduct[line.product.id],
                                    onEdit = {
                                        pickedProduct = line.product
                                        dialogState = ProductLineDialogMode.Edit(
                                            lineId = line.id,
                                            productName = line.product.name,
                                            productCode = line.product.code,
                                            initialQuantity = line.quantity,
                                            initialPrice = line.unitPrice,
                                        )
                                    },
                                    onDelete = { viewModel.removeLine(line.id) },
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
                    Spacer(modifier = Modifier.size(16.dp))
                }
            }
            if (isPosting) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            }
        }
    }

    dialogState?.let { mode ->
        val stockText = pickedProduct?.id?.let { id ->
            stockByProduct[id]?.let { stringResource(R.string.wizard_dialog_in_stock_format, it) }
        }
        InlineProductLineDialog(
            mode = mode,
            stockText = stockText,
            onDismiss = {
                dialogState = null
                pickedProduct = null
            },
            onSave = { qty, price ->
                when (val m = mode) {
                    is ProductLineDialogMode.Add -> {
                        pickedProduct?.let { viewModel.addLineWithExplicit(it, qty, price) }
                    }
                    is ProductLineDialogMode.Edit -> {
                        viewModel.replaceLine(m.lineId, qty, price)
                    }
                }
                dialogState = null
                pickedProduct = null
            },
        )
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
    if (showWarehousePicker) {
        WarehousePickerSheet(
            onWarehouseSelected = { warehouse ->
                viewModel.setWarehouse(warehouse)
                showWarehousePicker = false
            },
            onDismiss = { showWarehousePicker = false },
        )
    }
    if (showPriceTypePicker) {
        PriceTypePickerSheet(
            onPriceTypeSelected = { priceType ->
                viewModel.setPriceType(priceType)
                showPriceTypePicker = false
            },
            onDismiss = { showPriceTypePicker = false },
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

private fun totalOf(lines: List<WizardLine>): BigDecimal =
    lines.fold(BigDecimal.ZERO) { acc, line -> acc + line.total }

@Composable
private fun DraftResumeHint() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = SCREEN_GUTTER, vertical = 2.dp),
    ) {
        Surface(
            shape = RoundedCornerShape(50),
            color = MaterialTheme.colorScheme.surfaceVariant,
        ) {
            Text(
                text = stringResource(R.string.wizard_resume_hint),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            )
        }
    }
}

@Composable
private fun DashedChipRow(
    date: LocalDate,
    priceTypeName: String?,
    warehouseName: String?,
    warehouseError: Boolean,
    onDateClick: () -> Unit,
    onPriceTypeClick: () -> Unit,
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
            icon = Icons.Filled.Sell,
            text = priceTypeName
                ?: stringResource(R.string.wizard_chip_price_type_empty),
            hasValue = priceTypeName != null,
            modifier = Modifier.weight(1f),
            onClick = onPriceTypeClick,
        )
        WizardDashedChip(
            icon = Icons.Filled.Warehouse,
            text = warehouseName
                ?: stringResource(R.string.wizard_chip_warehouse_empty),
            hasValue = warehouseName != null,
            isError = warehouseError,
            modifier = Modifier.weight(1f),
            onClick = onWarehouseClick,
        )
    }
}

@Composable
private fun LineItemRow(
    line: WizardLine,
    stock: String?,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
) {
    val currency = LocalTenantCurrency.current
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
        ),
        shape = RoundedCornerShape(14.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = line.product.name,
                    style = MaterialTheme.typography.bodyLarge,
                    maxLines = 1,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                )
                Spacer(modifier = Modifier.size(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = stringResource(
                            R.string.wizard_line_calc_format,
                            line.quantity.toPlainString(),
                            String.format("%,.2f", line.unitPrice.toDouble()),
                        ),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(modifier = Modifier.size(4.dp))
                    Text(
                        text = formatMoney(line.total, currency),
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                }
                // Stock badge intentionally omitted on line cards — the
                // dropdown's per-row "295 шт." chip already tells the user
                // before they pick. Repeating it on the line clutters the
                // qty × price = total math.
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onEdit) {
                    Icon(
                        imageVector = Icons.Filled.Edit,
                        contentDescription = stringResource(R.string.wizard_edit_line),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                IconButton(onClick = onDelete) {
                    Icon(
                        imageVector = Icons.Filled.Close,
                        contentDescription = stringResource(R.string.wizard_delete_line),
                        tint = MaterialTheme.colorScheme.error.copy(alpha = 0.85f),
                    )
                }
            }
        }
    }
}

