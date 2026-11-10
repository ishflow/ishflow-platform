import APIClient
import AppShared
import Core
import Inventory
import SwiftUI

/// Single-screen sales-invoice entry redesigned to match the Android
/// "Variant A · Liquid Mirror" layout:
///
///   - NavigationStack with inline title + draft chip + barcode action
///   - Sticky action row (Save · Post) and sticky total bar pinned above
///     the scroll body via `.safeAreaInset(edge: .top)`
///   - Scroll body: dashed chip row (date · priceType · warehouse) →
///     numbered Customer row → inline product search → line cards
///
/// Model / posting / pickers / stock lookup are unchanged — only chrome
/// and layout differ from the legacy `Form`-based wizard.
public struct SalesWizardView: View {
    private let api: any APIClient
    @State private var model = SalesWizardModel()
    @State private var showCustomerPicker = false
    @State private var showProductPicker = false
    @State private var showLineEditor = false
    @State private var editingLineIndex: Int?
    @State private var showWarehousePicker = false
    @State private var showPriceTypePicker = false
    @State private var showDatePicker = false
    @State private var showScanner = false
    @State private var postError: String?
    @State private var resolverError: String?
    @State private var isPosting = false
    @State private var poster: SalesWizardPoster
    @State private var resolver: PriceResolver
    @State private var stockByProduct: [UUID: LineStockCheckView.StockLookup] = [:]
    /// Set when a product has been picked (search or barcode) and we still
    /// need quantity / price confirmation. Drives the `SalesWizardAddLineSheet`
    /// presentation. Nil = no pending product, no sheet.
    @State private var pendingProduct: PendingProduct?
    /// Fields the user must pick before posting. Populated when the user taps
    /// Post with required state missing — they get a red chip / row instead
    /// of a server error. Cleared field-by-field as values get picked.
    /// Mirrors Android `SalesWizardViewModel.missingFields`.
    @State private var missingFields: Set<MissingField> = []
    @Environment(AppSession.self) private var session
    @Environment(\.dismiss) private var dismiss

    /// Required-but-missing fields tracked for inline (chip-level) validation.
    private enum MissingField: Hashable {
        case warehouse
    }

    /// In-flight product waiting for quantity confirmation. Wraps the picked
    /// `CatalogRecord` together with the price already resolved by
    /// `PriceResolver` so the add sheet can pre-fill `unitPrice`.
    private struct PendingProduct: Identifiable {
        let id: UUID
        let product: CatalogRecord
        let initialPrice: Decimal

        init(product: CatalogRecord, initialPrice: Decimal) {
            self.id = product.id
            self.product = product
            self.initialPrice = initialPrice
        }
    }

    public init(api: any APIClient, initialModel: SalesWizardModel? = nil) {
        self.api = api
        if let initialModel {
            _model = State(wrappedValue: initialModel)
        }
        _poster = State(wrappedValue: SalesWizardPoster(api: api))
        _resolver = State(wrappedValue: PriceResolver(api: api))
    }

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: WizardTokens.sectionGap) {
                    chipRow
                    WizardNumberedRow(
                        number: 1,
                        label: "wizard.counterparty.label",
                        value: model.customer?.name,
                        placeholder: "wizard.counterparty.placeholder"
                    ) {
                        showCustomerPicker = true
                    }
                    .accessibilityIdentifier("wizard.customer.pick")

                    Divider().opacity(0.4)

                    WizardSearchField(
                        placeholder: "wizard.search.placeholder",
                        onTap: { showProductPicker = true },
                        onTrailingAction: { showProductPicker = true }
                    )
                    .accessibilityIdentifier("wizard.lines.addProduct")

                    linesList

                    AttachmentSection(
                        entity: "sales.invoice",
                        entityId: model.draftAttachmentId,
                        api: api
                    )
                    .padding(.top, 8)

                    if let error = postError {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                    if let error = resolverError {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.orange)
                    }
                }
                .padding(.horizontal, WizardTokens.screenGutter)
                .padding(.top, 12)
                .padding(.bottom, 32)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(Color(.systemBackground).ignoresSafeArea())
            .safeAreaInset(edge: .top, spacing: 0) {
                stickyTopChrome
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("common.cancel") { dismiss() }
                        .accessibilityIdentifier("wizard.cancel")
                }
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 8) {
                        Text("wizard.newSale")
                            .font(.system(size: 17, weight: .semibold))
                        WizardDraftChip()
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showScanner = true
                    } label: {
                        Image(systemName: "barcode.viewfinder")
                    }
                    .accessibilityLabel("wizard.scan")
                }
            }
            .sheet(isPresented: $showCustomerPicker) { customerPickerSheet }
            .sheet(isPresented: $showWarehousePicker) { warehousePickerSheet }
            .sheet(isPresented: $showPriceTypePicker) { priceTypePickerSheet }
            .sheet(isPresented: $showProductPicker) { productPickerSheet }
            .sheet(isPresented: $showLineEditor) { lineEditorSheet }
            .sheet(isPresented: $showDatePicker) { datePickerSheet }
            .sheet(isPresented: $showScanner) { scannerSheet }
            .sheet(item: $pendingProduct) { pending in
                SalesWizardAddLineSheet(
                    productName: pending.product.name,
                    initialPrice: pending.initialPrice,
                    currencyCode: tenantCurrency,
                    onCancel: { pendingProduct = nil },
                    onAdd: { qty, unitPrice in
                        model.addLine(
                            product: pending.product,
                            quantity: qty,
                            unitPrice: unitPrice
                        )
                        pendingProduct = nil
                        Task { await refreshStock(productId: pending.product.id) }
                    }
                )
            }
        }
        .task {
            await autoSelectWarehouseIfSingle()
        }
    }

    // MARK: - Sticky chrome

    private var stickyTopChrome: some View {
        VStack(spacing: 0) {
            WizardStickyActionRow(
                canSaveDraft: canSaveDraft,
                canPost: canPost,
                isPosting: isPosting,
                onSaveDraft: { Task { await save() } },
                onPost: { Task { await post() } }
            )
            WizardStickyTotalBar(
                label: itemsCountLabel,
                value: totalAmountFormatted,
                dim: model.lines.isEmpty
            )
            Divider().opacity(0.5)
        }
        .background(.bar)
    }

    // MARK: - Body sections

    private var chipRow: some View {
        HStack(spacing: 8) {
            WizardDashedChip(
                systemImage: "calendar",
                text: LocalizedStringKey(dateChipText),
                hasValue: true
            ) {
                showDatePicker = true
            }
            .accessibilityIdentifier("wizard.header.date.pick")

            WizardDashedChip(
                systemImage: "tag",
                text: model.priceType?.name.localizedKey ?? "wizard.chip.priceType.empty",
                hasValue: model.priceType != nil
            ) {
                showPriceTypePicker = true
            }
            .accessibilityIdentifier("wizard.header.priceType.pick")

            WizardDashedChip(
                systemImage: "building.2",
                text: model.warehouse?.name.localizedKey ?? "wizard.chip.warehouse.empty",
                hasValue: model.warehouse != nil,
                isError: missingFields.contains(.warehouse)
            ) {
                showWarehousePicker = true
            }
            .accessibilityIdentifier("wizard.header.warehouse.pick")
        }
    }

    @ViewBuilder
    private var linesList: some View {
        if !model.lines.isEmpty {
            VStack(spacing: 8) {
                ForEach(Array(model.lines.enumerated()), id: \.element.id) { idx, line in
                    VStack(alignment: .leading, spacing: 4) {
                        WizardLineCard(
                            productName: line.product.name,
                            calc: lineCalcText(line),
                            total: line.total.formatted(.currency(code: tenantCurrency)),
                            onEdit: {
                                editingLineIndex = idx
                                showLineEditor = true
                            },
                            onDelete: {
                                model.removeLine(line)
                            }
                        )
                        .accessibilityIdentifier("wizard.line.\(line.product.id)")
                        if model.warehouse != nil {
                            LineStockCheckView(
                                lookup: stockByProduct[line.product.id] ?? .unknown,
                                currentQty: line.quantity
                            )
                            .padding(.horizontal, 14)
                            .accessibilityIdentifier("wizard.line.\(line.product.id).stock")
                        }
                    }
                }
            }
            .padding(.top, 4)
        }
    }

    // MARK: - Sheets

    private var customerPickerSheet: some View {
        CustomerPickerSheet(api: api) { picked in
            model.customer = picked
            if let ref = picked.defaultPriceType, let uuid = UUID(uuidString: ref.id) {
                model.priceType = CatalogRecord(
                    id: uuid,
                    name: ref.name,
                    createdAt: .now,
                    updatedAt: .now
                )
                Task {
                    await model.reapplyPriceType(
                        priceTypeId: ref.id.lowercased(),
                        resolver: resolver
                    )
                }
            }
            showCustomerPicker = false
        }
        .presentationDetents([.medium, .large])
    }

    private var warehousePickerSheet: some View {
        WarehousePickerSheet(api: api) { picked in
            model.warehouse = picked
            missingFields.remove(.warehouse)
            showWarehousePicker = false
            Task { await refreshAllStocks() }
        }
        .presentationDetents([.medium, .large])
    }

    private var priceTypePickerSheet: some View {
        PriceTypePickerSheet(api: api) { picked in
            model.priceType = picked
            Task {
                await model.reapplyPriceType(
                    priceTypeId: picked.id.uuidString.lowercased(),
                    resolver: resolver
                )
            }
            showPriceTypePicker = false
        }
        .presentationDetents([.medium, .large])
    }

    private var productPickerSheet: some View {
        ProductPickerSheet(api: api) { product in
            showProductPicker = false
            Task { await openAddLineSheet(for: product) }
        }
        .presentationDetents([.medium, .large])
    }

    @ViewBuilder
    private var lineEditorSheet: some View {
        if let idx = editingLineIndex, model.lines.indices.contains(idx) {
            SalesWizardLineEditorSheet(
                line: $model.lines[idx],
                onSave: {
                    showLineEditor = false
                    editingLineIndex = nil
                },
                onCancel: {
                    showLineEditor = false
                    editingLineIndex = nil
                }
            )
        }
    }

    private var datePickerSheet: some View {
        NavigationStack {
            DatePicker(
                "wizard.header.date",
                selection: $model.date,
                displayedComponents: .date
            )
            .datePickerStyle(.graphical)
            .padding(.horizontal)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("common.done") { showDatePicker = false }
                }
            }
        }
        .presentationDetents([.medium])
    }

    private var scannerSheet: some View {
        InvoiceLineBarcodeScanner(api: api) { product in
            showScanner = false
            Task { await openAddLineSheet(for: product) }
        }
    }

    /// Resolve the product's unit price against the active price-type, then
    /// surface the add-line sheet. Resolution errors are surfaced via
    /// `resolverError` but do not block the user — we fall back to the
    /// catalog `salePrice` (or 0) and let them tweak it in the sheet.
    private func openAddLineSheet(for product: CatalogRecord) async {
        var resolvedPrice: Decimal = product.salePrice?.value ?? 0
        if let priceTypeId = model.priceType?.id.uuidString.lowercased(),
           !priceTypeId.isEmpty {
            do {
                if let resolved = try await resolver.resolve(
                    productId: product.id.uuidString.lowercased(),
                    priceTypeId: priceTypeId
                ) {
                    resolvedPrice = resolved
                }
            } catch {
                resolverError = error.localizedDescription
            }
        }
        pendingProduct = PendingProduct(
            product: product,
            initialPrice: resolvedPrice
        )
    }

    // MARK: - Derived state

    private var canSaveDraft: Bool {
        !isPosting && model.canAdvance(from: .customer)
    }

    private var canPost: Bool {
        !isPosting
            && model.canAdvance(from: .customer)
            && model.canAdvance(from: .lines)
    }

    private var totalAmount: Decimal {
        model.lines.reduce(Decimal.zero) { $0 + $1.total }
    }

    private var totalAmountFormatted: String {
        totalAmount.formatted(.currency(code: tenantCurrency))
    }

    private var itemsCountLabel: String {
        String.localizedStringWithFormat(
            NSLocalizedString(
                "wizard.total.items.format",
                value: "Итого, %lld поз.",
                comment: "Sticky total bar — running line count"
            ),
            model.lines.count
        )
    }

    private var dateChipText: String {
        model.date.formatted(.dateTime.day().month(.abbreviated))
    }

    private var tenantCurrency: String {
        session.tenant?.currency ?? "USD"
    }

    private func lineCalcText(_ line: SalesWizardModel.Line) -> String {
        let qty = line.quantity.formatted(.number)
        let price = line.unitPrice.formatted(.currency(code: tenantCurrency))
        return "\(qty) × \(price) ="
    }

    // MARK: - Async helpers (unchanged from prior version)

    private func autoSelectWarehouseIfSingle() async {
        guard model.warehouse == nil else { return }
        struct Req: APIRequest {
            typealias Response = CatalogListResponse
            let path = "/api/mobile/catalogs/inventory.warehouse"
            let method: HTTPMethod = .get
            let query: [String: String]? = [:]
        }
        guard let resp = try? await api.send(Req()) else { return }
        if resp.items.count == 1 {
            model.warehouse = resp.items[0]
            await refreshAllStocks()
        }
    }

    private func refreshAllStocks() async {
        for line in model.lines {
            await refreshStock(productId: line.product.id)
        }
    }

    private func refreshStock(productId: UUID) async {
        guard let warehouseId = model.warehouse?.id else { return }
        // swiftlint:disable nesting
        struct Resp: Decodable {
            let items: [Item]
            struct Item: Decodable {
                let productId: String
                let byWarehouse: [Entry]
            }
            struct Entry: Decodable {
                let warehouseId: String
                let warehouseName: String
                let qty: String
            }
        }
        struct Req: APIRequest {
            typealias Response = Resp
            let path = "/api/mobile/inventory/stock"
            let method: HTTPMethod = .get
            let query: [String: String]?
        }
        // swiftlint:enable nesting
        do {
            let pid = productId.uuidString.lowercased()
            let resp = try await api.send(Req(query: ["productIds": pid]))
            let target = warehouseId.uuidString.lowercased()
            let entry = resp.items.first?.byWarehouse
                .first { $0.warehouseId.lowercased() == target }
            if let entry, let qty = Decimal(string: entry.qty) {
                stockByProduct[productId] = .onHand(qty)
            } else {
                stockByProduct[productId] = .noStock
            }
        } catch {
            stockByProduct[productId] = .failed(String(describing: error))
        }
    }

    private func post() async {
        // Local validation — fields missing required for the inventory_balance
        // register get flagged on the chip (red), no server roundtrip.
        var missing: Set<MissingField> = []
        if model.warehouse == nil { missing.insert(.warehouse) }
        guard missing.isEmpty else {
            missingFields = missing
            return
        }
        missingFields = []

        postError = nil
        isPosting = true
        defer { isPosting = false }
        do {
            try await poster.post(model: model)
            dismiss()
        } catch {
            postError = friendlyPostError(error)
        }
    }

    /// Map a raw posting error to a human-readable message. The server
    /// surfaces validation failures as `{"error":"posting_validation",
    /// "reason":"..."}` with HTTP 400 — decode the reason and translate
    /// known cases. Anything unmapped falls back to a generic message
    /// so the user never sees a wire-format dump like
    /// `http(status: 400, body: Optional(130 bytes))`.
    private func friendlyPostError(_ error: Error) -> String {
        if case let APIError.http(status, body) = error {
            if status == 400, let body, let reason = decodePostingValidationReason(body) {
                switch reason {
                case "insufficientStock":
                    return "Bu depoda bu üründen yeterli stok yok"
                case "belowCost":
                    return "Satış fiyatı maliyetin altında"
                case "periodClosed":
                    return "Bu tarih kapatılmış bir döneme ait"
                default:
                    break
                }
            }
            if status == 409 {
                return "Bu doküman zaten onaylanmış"
            }
            if status == 402 {
                return "Plan limiti aşıldı"
            }
            if status == 401 {
                return "Oturum süresi doldu — yeniden giriş yapın"
            }
        }
        if case APIError.network = error {
            return "İnternet bağlantısı yok"
        }
        return "Onaylama başarısız oldu — lütfen tekrar deneyin"
    }

    private func decodePostingValidationReason(_ body: Data) -> String? {
        struct Envelope: Decodable {
            let error: String?
            let reason: String?
        }
        guard let env = try? JSONDecoder().decode(Envelope.self, from: body) else { return nil }
        return env.error == "posting_validation" ? env.reason : nil
    }

    private func save() async {
        isPosting = true
        defer { isPosting = false }
        do {
            _ = try await poster.saveDraft(model: model)
            dismiss()
        } catch {
            postError = String(describing: error)
        }
    }
}

/// Convenience to convert an already-translated user-facing string into a
/// `LocalizedStringKey` that SwiftUI will render verbatim. Used for chip
/// values that come from API data (warehouse name, price type name).
private extension String {
    var localizedKey: LocalizedStringKey { LocalizedStringKey(self) }
}
