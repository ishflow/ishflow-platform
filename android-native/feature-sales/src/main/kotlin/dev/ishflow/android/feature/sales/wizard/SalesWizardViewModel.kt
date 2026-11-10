package dev.ishflow.android.feature.sales.wizard

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.CatalogRecord
import dev.ishflow.android.appshared.models.DocumentRecord
import dev.ishflow.android.core.attachments.AttachmentMeta
import dev.ishflow.android.core.attachments.AttachmentUploader
import dev.ishflow.android.core.pickers.RecentProductsStore
import dev.ishflow.android.core.scanner.DocumentScanner
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID
import javax.inject.Inject

/**
 * Provenance of a line's unit price — drives the small Layer-2 hint chip
 * next to the price field (mirrors iOS PR #80's "Where did this price come
 * from?" UX).
 */
private const val SALES_INVOICE_ATTACHMENT_ENTITY = "document.sales.invoice"

/** Required header fields surfaced by inline red borders when blank at Save/Post. */
enum class MissingField { WAREHOUSE, CUSTOMER }

enum class PriceSource {
    /** Resolved via the customer's default price type. */
    PriceType,

    /** Resolver returned null; we fell back to `product.salePrice`. */
    SalePrice,

    /** No customer/priceType + no salePrice; line started at zero. */
    Zero,

    /** User edited the price field manually. */
    Custom,
}

data class WizardLine(
    val id: String = UUID.randomUUID().toString(),
    val product: CatalogRecord,
    val quantity: BigDecimal = BigDecimal.ONE,
    val unitPrice: BigDecimal = BigDecimal.ZERO,
    val priceSource: PriceSource = PriceSource.Zero,
    val priceTypeName: String? = null,
) {
    val total: BigDecimal get() = quantity.multiply(unitPrice)
}

data class WizardDraft(
    val customer: CatalogRecord? = null,
    val date: LocalDate = LocalDate.now(),
    val lines: List<WizardLine> = emptyList(),
    val priceType: CatalogRecord? = null,
    val warehouse: CatalogRecord? = null,
) {
    companion object {
        /**
         * Restores a [WizardDraft] from a server [DocumentRecord] so the user
         * can continue editing a saved draft invoice. Fields not returned by the
         * detail endpoint (warehouse, priceType) are left null and filled by
         * [SalesWizardViewModel.bootstrapDefaultWarehouse] or user interaction.
         */
        fun fromRecord(record: DocumentRecord): WizardDraft {
            val customer = record.customer?.let { party ->
                CatalogRecord(
                    id = party.id,
                    name = party.name,
                    createdAt = Instant.EPOCH,
                    updatedAt = Instant.EPOCH,
                )
            }
            val date = record.date.atZone(ZoneId.systemDefault()).toLocalDate()
            val lines = record.items.orEmpty().map { line ->
                val product = CatalogRecord(
                    id = line.productId,
                    name = line.productName ?: line.productId,
                    createdAt = Instant.EPOCH,
                    updatedAt = Instant.EPOCH,
                )
                WizardLine(
                    id = line.id,
                    product = product,
                    quantity = line.quantity.toBigDecimalOrNull() ?: BigDecimal.ONE,
                    unitPrice = line.price.toBigDecimalOrNull() ?: BigDecimal.ZERO,
                    priceSource = PriceSource.Custom,
                )
            }
            return WizardDraft(customer = customer, date = date, lines = lines)
        }
    }
}

@HiltViewModel
class SalesWizardViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val poster: SalesWizardPoster,
    private val priceResolver: PriceResolver,
    private val api: ApiService,
    private val recentProductsStore: RecentProductsStore,
    private val uploader: AttachmentUploader,
    private val scanner: DocumentScanner,
) : ViewModel() {

    private val draftId: String = savedStateHandle.get<String>("draftId").orEmpty()

    /**
     * Stable per-wizard draft attachment id. Attachments upload with this as
     * `entityId`; on document create we ship it as `attachmentDraftId` in the
     * payload so the server rebinds rows to the real document id.
     */
    val draftAttachmentId: String = UUID.randomUUID().toString()

    private val _attachments = MutableStateFlow<List<AttachmentMeta>>(emptyList())
    val attachments: StateFlow<List<AttachmentMeta>> = _attachments

    private val _uploadingCount = MutableStateFlow(0)
    val uploadingCount: StateFlow<Int> = _uploadingCount

    private val _attachmentErrors = MutableStateFlow<String?>(null)
    val attachmentErrors: StateFlow<String?> = _attachmentErrors

    private val _scanIntents = kotlinx.coroutines.channels.Channel<android.content.IntentSender>(
        kotlinx.coroutines.channels.Channel.BUFFERED,
    )
    val scanIntents = _scanIntents.receiveAsFlow()

    private val _draft = MutableStateFlow(WizardDraft())
    val draft: StateFlow<WizardDraft> = _draft

    private val _isPosting = MutableStateFlow(false)
    val isPosting: StateFlow<Boolean> = _isPosting

    private val _postResult = MutableStateFlow<Result<String>?>(null)
    val postResult: StateFlow<Result<String>?> = _postResult

    /**
     * Set to a non-null token whenever the barcode scanner returns a code
     * that doesn't resolve to a product. The screen observes this, shows a
     * snackbar, then calls [consumeBarcodeError] to acknowledge.
     */
    private val _barcodeError = MutableStateFlow<Long?>(null)
    val barcodeError: StateFlow<Long?> = _barcodeError

    /**
     * Keyed by productId → total available stock (sum across all warehouses).
     * Populated lazily when a product is added to a line; used by the UI to
     * render an inline "In stock: X" badge per line.
     */
    private val _stockByProduct = MutableStateFlow<Map<String, String>>(emptyMap())
    val stockByProduct: StateFlow<Map<String, String>> = _stockByProduct.asStateFlow()

    /**
     * Required header fields the user tapped Save/Post on while still empty.
     * The screen turns the matching chip's dashed border red instead of
     * surfacing a generic "No internet connection" snackbar (the poster
     * used to `error()` on the missing field, which then fell through the
     * httpCode = null path in ApiErrorStrings).
     *
     * Cleared automatically when the user fills the matching field, and on
     * every retry attempt before re-validation.
     */
    private val _missingFields = MutableStateFlow<Set<MissingField>>(emptySet())
    val missingFields: StateFlow<Set<MissingField>> = _missingFields.asStateFlow()

    init {
        if (draftId.isNotBlank()) {
            loadExistingDraft(draftId)
        } else {
            bootstrapDefaultWarehouse()
        }
    }

    /**
     * Loads an existing draft invoice into the wizard state. Called when the
     * user taps "Continue editing" from [SalesDetailScreen] for a DRAFT doc.
     * Falls back to an empty draft on failure (the snackbar is emitted but
     * wizard still opens so the user isn't stuck).
     *
     * The mobile detail endpoint doesn't return warehouse or priceType, so
     * after restoring we fall back to the standard bootstraps — single-
     * warehouse tenants auto-pick, and the customer's `defaultPriceType`
     * fills the price-type chip.
     */
    private fun loadExistingDraft(id: String) {
        viewModelScope.launch {
            runCatching { api.getDocument("sales.invoice", id) }
                .onSuccess { record ->
                    _draft.value = WizardDraft.fromRecord(record)
                    if (_draft.value.warehouse == null) bootstrapDefaultWarehouse()
                    bootstrapPriceTypeFromCustomer()
                    resolveRestoredCustomerDefaults()
                    resolveRestoredProductNames()
                }
                .onFailure { bootstrapDefaultWarehouse() }
        }
    }

    /**
     * `WizardDraft.fromRecord` rebuilds the customer from `PartyRef`, which
     * only carries `id + name` — `defaultPriceType` is dropped. As a result
     * [bootstrapPriceTypeFromCustomer] sees a null default and the price-type
     * chip stays empty until the user re-picks the customer manually.
     *
     * Pull the full `sales.customer` record from the catalog list (single
     * pageSize=100 request) and patch the draft's customer in place. Then
     * re-run the price-type bootstrap so the chip auto-fills.
     */
    private fun resolveRestoredCustomerDefaults() {
        val current = _draft.value.customer ?: return
        if (current.defaultPriceType != null) return
        viewModelScope.launch {
            runCatching { api.listCatalog("sales.customer", pageSize = 100) }
                .onSuccess { response ->
                    val full = response.items.firstOrNull { it.id == current.id } ?: return@onSuccess
                    if (full.defaultPriceType == null) return@onSuccess
                    _draft.value = _draft.value.copy(customer = full)
                    bootstrapPriceTypeFromCustomer()
                }
        }
    }

    /**
     * The mobile document endpoint returns `productId` for each line but
     * usually not `productName`, so [WizardDraft.fromRecord] falls back to
     * the id as the display label and the user sees a UUID. Fix it by
     * pulling the catalog list once after restore and patching any line
     * whose `product.name` still equals its id.
     *
     * Single-page (pageSize=100) lookup — sufficient for typical small
     * catalogs. A tenant with >100 products would still see UUIDs on lines
     * whose product fell off the first page; switch to a per-id query if
     * that becomes a real complaint.
     */
    private fun resolveRestoredProductNames() {
        val lines = _draft.value.lines
        if (lines.none { it.product.name == it.product.id }) return
        viewModelScope.launch {
            runCatching { api.listCatalog("inventory.product", pageSize = 100) }
                .onSuccess { response ->
                    val byId = response.items.associateBy { it.id }
                    val patched = _draft.value.lines.map { line ->
                        val resolved = byId[line.product.id]
                        if (resolved != null && line.product.name == line.product.id) {
                            line.copy(product = resolved)
                        } else {
                            line
                        }
                    }
                    _draft.value = _draft.value.copy(lines = patched)
                }
        }
    }

    /**
     * Fills [WizardDraft.priceType] from the restored customer's
     * `defaultPriceType` when the loaded draft has no price type yet. No-op
     * if the draft already has a price type or the customer has no default.
     *
     * Existing restored lines are marked [PriceSource.Custom] so
     * [reapplyPriceType] leaves their saved unit prices alone — we only want
     * the chip to show the inferred type, not overwrite user input.
     */
    private fun bootstrapPriceTypeFromCustomer() {
        val current = _draft.value
        if (current.priceType != null) return
        val customer = current.customer ?: return
        val inferred = priceTypeFromCustomer(customer) ?: return
        _draft.value = current.copy(priceType = inferred)
        if (current.lines.isNotEmpty()) {
            viewModelScope.launch { reapplyPriceType(inferred) }
        }
    }

    fun setCustomer(customer: CatalogRecord) {
        val priceType = priceTypeFromCustomer(customer)
        _draft.value = _draft.value.copy(customer = customer, priceType = priceType)
        clearMissing(MissingField.CUSTOMER)
        if (priceType != null && _draft.value.lines.isNotEmpty()) {
            viewModelScope.launch { reapplyPriceType(priceType) }
        }
    }

    fun setDate(date: LocalDate) {
        _draft.value = _draft.value.copy(date = date)
    }

    fun setWarehouse(warehouse: CatalogRecord) {
        _draft.value = _draft.value.copy(warehouse = warehouse)
        clearMissing(MissingField.WAREHOUSE)
    }

    private fun clearMissing(field: MissingField) {
        if (field !in _missingFields.value) return
        _missingFields.value = _missingFields.value - field
    }

    /**
     * Manual price-type override. Re-resolves prices for every non-Custom line
     * against the new type, mirroring [setCustomer]'s reapply path.
     */
    fun setPriceType(priceType: CatalogRecord) {
        _draft.value = _draft.value.copy(priceType = priceType)
        if (_draft.value.lines.isNotEmpty()) {
            viewModelScope.launch { reapplyPriceType(priceType) }
        }
    }

    /**
     * Adds a new line, resolving the unit price asynchronously when a price
     * type is set. Fire-and-forget — the line appears immediately at
     * [BigDecimal.ZERO] (or [CatalogRecord.salePrice]) and the resolved value
     * arrives shortly after via [updateLineFromResolver].
     */
    fun addLineResolvingPrice(product: CatalogRecord) {
        val seed = seedPriceForProduct(product)
        val newLine = WizardLine(
            product = product,
            unitPrice = seed.first,
            priceSource = seed.second,
            priceTypeName = if (seed.second == PriceSource.PriceType) {
                _draft.value.priceType?.name
            } else {
                null
            },
        )
        _draft.value = _draft.value.copy(lines = _draft.value.lines + newLine)

        recentProductsStore.push(product.id)
        loadStockFor(product.id)

        val priceType = _draft.value.priceType ?: return
        viewModelScope.launch {
            val resolved = priceResolver.resolve(product.id, priceType.id)
            if (resolved != null) {
                updateLineFromResolver(newLine.id, resolved, priceType.name)
            }
        }
    }

    /**
     * Resolves a scanned barcode to a product, then dispatches through
     * [addLineResolvingPrice] so the line picks up the customer's price type.
     *
     * No server endpoint maps barcodes today (no `barcode` field on the
     * product catalog yet), so we treat the scanned token as the product
     * `code` and search via the standard catalog list endpoint. If nothing
     * matches, we emit a one-shot error token the screen turns into a
     * snackbar.
     */
    fun addLineByBarcode(barcode: String) {
        val token = barcode.trim()
        if (token.isEmpty()) {
            emitBarcodeError()
            return
        }
        viewModelScope.launch {
            val product = runCatching { api.listCatalog("inventory.product", query = token, pageSize = 5) }
                .fold(
                    onSuccess = { resp ->
                        resp.items.firstOrNull { it.code.equals(token, ignoreCase = true) }
                            ?: resp.items.firstOrNull()
                    },
                    onFailure = { e ->
                        if (e is CancellationException) throw e
                        null
                    },
                )
            if (product != null) {
                addLineResolvingPrice(product)
            } else {
                emitBarcodeError()
            }
        }
    }

    /** Caller signal that the snackbar has been shown — clears the latch. */
    fun consumeBarcodeError() {
        _barcodeError.value = null
    }

    private fun emitBarcodeError() {
        _barcodeError.value = System.nanoTime()
    }

    fun removeLine(lineId: String) {
        _draft.value = _draft.value.copy(
            lines = _draft.value.lines.filter { it.id != lineId },
        )
    }

    fun updateLineQuantity(lineId: String, quantity: BigDecimal) {
        _draft.value = _draft.value.copy(
            lines = _draft.value.lines.map { line ->
                if (line.id == lineId) line.copy(quantity = quantity) else line
            },
        )
    }

    fun updateLinePrice(lineId: String, price: BigDecimal) {
        _draft.value = _draft.value.copy(
            lines = _draft.value.lines.map { line ->
                if (line.id == lineId) {
                    line.copy(
                        unitPrice = price,
                        priceSource = PriceSource.Custom,
                        priceTypeName = null,
                    )
                } else {
                    line
                }
            },
        )
    }

    /**
     * Adds a new line with explicit qty + unit price set by the user (typically
     * via [InlineProductLineDialog]). Skips the async price resolver — the
     * dialog already showed the user the resolved price and they confirmed.
     *
     * Marks the new line as [PriceSource.PriceType] when `unitPrice` matches the
     * draft's current price-type seed (currently `BigDecimal.ZERO`), otherwise
     * [PriceSource.Custom]. Triggers the same lazy stock fetch as
     * [addLineResolvingPrice].
     */
    fun addLineWithExplicit(
        product: CatalogRecord,
        qty: BigDecimal,
        unitPrice: BigDecimal,
    ) {
        val seed = seedPriceForProduct(product)
        val matchesSeed = unitPrice.compareTo(seed.first) == 0
        val source = if (matchesSeed) seed.second else PriceSource.Custom
        val priceTypeName = if (source == PriceSource.PriceType) _draft.value.priceType?.name else null
        val newLine = WizardLine(
            product = product,
            quantity = qty,
            unitPrice = unitPrice,
            priceSource = source,
            priceTypeName = priceTypeName,
        )
        _draft.value = _draft.value.copy(lines = _draft.value.lines + newLine)
        recentProductsStore.push(product.id)
        loadStockFor(product.id)
    }

    /**
     * Updates [lineId]'s quantity and unit price in a single state emission.
     * Used by the inline edit dialog so observers see the new totals atomically.
     *
     * No-op when no line matches [lineId].
     */
    fun replaceLine(lineId: String, qty: BigDecimal, unitPrice: BigDecimal) {
        val current = _draft.value
        if (current.lines.none { it.id == lineId }) return
        _draft.value = current.copy(
            lines = current.lines.map { line ->
                if (line.id == lineId) {
                    line.copy(
                        quantity = qty,
                        unitPrice = unitPrice,
                        priceSource = PriceSource.Custom,
                        priceTypeName = null,
                    )
                } else {
                    line
                }
            },
        )
    }

    fun post() {
        if (!validateRequiredFields()) return
        viewModelScope.launch {
            _isPosting.value = true
            val hasAttachments = _attachments.value.isNotEmpty()
            // Pass draftId so the poster PATCHes the existing SAVED record
            // instead of creating a duplicate. Blank id → fresh create path.
            _postResult.value = poster.postWizard(
                _draft.value,
                draftId.takeIf { it.isNotBlank() },
                attachmentDraftId = draftAttachmentId.takeIf { hasAttachments },
            )
            _isPosting.value = false
        }
    }

    /**
     * Persists the invoice in DRAFT state without firing the SAVED→POSTED
     * transition. Mirrors iOS [SalesWizardPoster.saveDraft].
     */
    fun saveDraft() {
        if (!validateRequiredFields()) return
        viewModelScope.launch {
            _isPosting.value = true
            val hasAttachments = _attachments.value.isNotEmpty()
            _postResult.value = poster.saveDraft(
                _draft.value,
                draftId.takeIf { it.isNotBlank() },
                attachmentDraftId = draftAttachmentId.takeIf { hasAttachments },
            )
            _isPosting.value = false
        }
    }

    /**
     * Uploads [uri] as a new attachment on this draft. UI feedback flows
     * through [uploadingCount] and [attachmentErrors].
     */
    @Suppress("TooGenericExceptionCaught")
    fun attach(uri: android.net.Uri) {
        viewModelScope.launch {
            _uploadingCount.update { it + 1 }
            try {
                val result = uploader.upload(
                    uri = uri,
                    entity = SALES_INVOICE_ATTACHMENT_ENTITY,
                    entityId = draftAttachmentId,
                )
                result.fold(
                    onSuccess = { meta -> _attachments.update { it + meta } },
                    onFailure = { err -> _attachmentErrors.value = err.localizedMessage ?: err.message },
                )
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _attachmentErrors.value = e.localizedMessage ?: e.message
            } finally {
                _uploadingCount.update { (it - 1).coerceAtLeast(0) }
            }
        }
    }

    fun detach(attachmentId: String) {
        _attachments.update { current -> current.filterNot { it.id == attachmentId } }
    }

    /**
     * Launches the ML Kit document scanner. Emits an [android.content.IntentSender] on
     * [scanIntents] for the screen to feed into a `StartIntentSenderForResult` launcher.
     */
    @Suppress("TooGenericExceptionCaught")
    fun openScanner(activity: android.app.Activity) {
        viewModelScope.launch {
            try {
                val sender = scanner.buildIntentSender(activity)
                _scanIntents.send(sender)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _attachmentErrors.value = e.localizedMessage ?: e.message
            }
        }
    }

    /** Parses the activity-result intent ML Kit returns and uploads every page. */
    fun handleScanResult(data: android.content.Intent?) {
        scanner.parseResult(data).forEach { attach(it) }
    }

    fun clearAttachmentError() {
        _attachmentErrors.value = null
    }

    /**
     * Returns true when all required header fields are filled. Otherwise
     * populates [_missingFields] so the screen turns the matching chip's
     * dashed border red and stays silent — no toast, no network call.
     */
    private fun validateRequiredFields(): Boolean {
        val current = _draft.value
        val missing = buildSet {
            if (current.customer == null) add(MissingField.CUSTOMER)
            if (current.warehouse == null) add(MissingField.WAREHOUSE)
        }
        _missingFields.value = missing
        return missing.isEmpty()
    }

    /**
     * Fetches total available stock for [productId] across all warehouses and
     * stores the result in [_stockByProduct]. Skips the fetch if the result is
     * already cached. Fire-and-forget — failures are silently swallowed so the
     * wizard stays functional even without stock data.
     */
    private fun loadStockFor(productId: String) {
        if (_stockByProduct.value.containsKey(productId)) return
        viewModelScope.launch {
            runCatching {
                val response = api.getStockBalancesByProduct(product = productId)
                val total = response.rows
                    .mapNotNull { it.quantity }
                    .fold(BigDecimal.ZERO) { acc, qty -> acc + qty }
                    .toPlainString()
                _stockByProduct.update { it + (productId to total) }
            }
        }
    }

    /**
     * Pre-selects the warehouse if the tenant has exactly one. Multi-warehouse
     * tenants still pick manually. Mirrors iOS `bootstrapDefaultWarehouse`.
     */
    private fun bootstrapDefaultWarehouse() {
        viewModelScope.launch {
            runCatching { api.listCatalog("inventory.warehouse", pageSize = 2) }
                .onSuccess { resp ->
                    if (resp.items.size == 1 && _draft.value.warehouse == null) {
                        _draft.value = _draft.value.copy(warehouse = resp.items[0])
                    }
                }
        }
    }

    private fun seedPriceForProduct(product: CatalogRecord): Pair<BigDecimal, PriceSource> {
        if (_draft.value.priceType != null) {
            return BigDecimal.ZERO to PriceSource.PriceType
        }
        val sale = product.salePrice
        return if (sale != null) sale to PriceSource.SalePrice else BigDecimal.ZERO to PriceSource.Zero
    }

    private fun updateLineFromResolver(lineId: String, price: BigDecimal, priceTypeName: String?) {
        _draft.value = _draft.value.copy(
            lines = _draft.value.lines.map { line ->
                if (line.id == lineId && line.priceSource != PriceSource.Custom) {
                    line.copy(
                        unitPrice = price,
                        priceSource = PriceSource.PriceType,
                        priceTypeName = priceTypeName,
                    )
                } else {
                    line
                }
            },
        )
    }

    /**
     * Re-resolves prices for every existing line that hasn't been manually
     * edited. Triggered when the customer changes (and therefore the
     * inferred price type may change too). Mirrors iOS `reapplyPriceType`.
     */
    private suspend fun reapplyPriceType(priceType: CatalogRecord) {
        val targetLines = _draft.value.lines.filter { it.priceSource != PriceSource.Custom }
        targetLines.forEach { line ->
            val resolved = priceResolver.resolve(line.product.id, priceType.id)
            if (resolved != null) {
                updateLineFromResolver(line.id, resolved, priceType.name)
            }
        }
    }

    private fun priceTypeFromCustomer(customer: CatalogRecord): CatalogRecord? {
        val ref = customer.defaultPriceType ?: return null
        return CatalogRecord(
            id = ref.id,
            name = ref.name,
            createdAt = Instant.EPOCH,
            updatedAt = Instant.EPOCH,
        )
    }
}
