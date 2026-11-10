import APIClient
import AppShared
import Core
import Sales
import SwiftUI

/// Single-screen `purchases.invoice` entry redesigned to the wizard
/// "Variant A · Liquid Mirror" pattern shared with `SalesWizardView`:
///
///   - NavigationStack with inline title + draft chip
///   - Sticky action row + sticky total bar (amber tint, money-out)
///   - Scroll body: date + warehouse chip row → numbered supplier →
///     product search → line cards → attachments card
///
/// Posting / model / picker logic is preserved; only chrome and layout
/// differ from the legacy `Form`-based wizard.
public struct PurchaseInvoiceWizardView: View {
    private let api: any APIClient
    @State private var model = PurchaseInvoiceWizardModel()
    @State private var showSupplierPicker = false
    @State private var showWarehousePicker = false
    @State private var showProductPicker = false
    @State private var showDatePicker = false
    @State private var pendingProduct: PendingProduct?
    @State private var editingLineIndex: Int?
    @State private var postError: String?
    @State private var isPosting = false
    @State private var poster: PurchaseInvoiceWizardPoster?
    @State private var missingFields: Set<MissingField> = []
    @Environment(AppSession.self) private var session
    @Environment(\.dismiss) private var dismiss

    private enum MissingField: Hashable {
        case warehouse
    }

    /// In-flight product waiting for quantity + price confirmation.
    private struct PendingProduct: Identifiable {
        let id: UUID
        let product: CatalogRecord

        init(product: CatalogRecord) {
            self.id = product.id
            self.product = product
        }
    }

    public init(api: any APIClient) {
        self.api = api
    }

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: WizardTokens.sectionGap) {
                    chipRow
                    WizardNumberedRow(
                        number: 1,
                        label: "wizard.supplier.label",
                        value: model.selectedSupplier?.name,
                        placeholder: "wizard.supplier.placeholder"
                    ) {
                        showSupplierPicker = true
                    }
                    .accessibilityIdentifier("wizard.supplier.pick")

                    Divider().opacity(0.4)

                    WizardSearchField(
                        placeholder: "wizard.search.placeholder",
                        onTap: { showProductPicker = true },
                        onTrailingAction: { showProductPicker = true }
                    )
                    .accessibilityIdentifier("wizard.lines.addProduct")

                    linesList

                    AttachmentSection(
                        entity: "purchases.invoice",
                        entityId: model.draftId,
                        api: api
                    )

                    if let error = postError {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                }
                .padding(.horizontal, WizardTokens.screenGutter)
                .padding(.top, 12)
                .padding(.bottom, 32)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(Color(.systemBackground).ignoresSafeArea())
            .safeAreaInset(edge: .top, spacing: 0) { stickyTopChrome }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("common.cancel") { dismiss() }
                        .accessibilityIdentifier("wizard.cancel")
                }
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 8) {
                        Text("wizard.newPurchase")
                            .font(.system(size: 17, weight: .semibold))
                        WizardDraftChip()
                    }
                }
            }
            .sheet(isPresented: $showSupplierPicker) { supplierPickerSheet }
            .sheet(isPresented: $showWarehousePicker) { warehousePickerSheet }
            .sheet(isPresented: $showProductPicker) { productPickerSheet }
            .sheet(isPresented: $showDatePicker) { datePickerSheet }
            .sheet(isPresented: Binding(
                get: { editingLineIndex != nil },
                set: { if !$0 { editingLineIndex = nil } }
            )) { lineEditorSheet }
            .sheet(item: $pendingProduct) { pending in
                SalesWizardAddLineSheet(
                    productName: pending.product.name,
                    initialPrice: 0,
                    currencyCode: tenantCurrency,
                    onCancel: { pendingProduct = nil },
                    onAdd: { qty, unitPrice in
                        model.addLine(
                            product: pending.product,
                            quantity: qty,
                            price: unitPrice
                        )
                        pendingProduct = nil
                    }
                )
            }
        }
        .task {
            if poster == nil { poster = PurchaseInvoiceWizardPoster(api: api) }
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
                dim: model.lines.isEmpty,
                tint: .orange
            )
            Divider().opacity(0.5)
        }
        .background(.bar)
    }

    // MARK: - Body

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
                systemImage: "building.2",
                text: model.selectedWarehouse?.name.localizedKey ?? "wizard.chip.warehouse.empty",
                hasValue: model.selectedWarehouse != nil,
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
                    WizardLineCard(
                        productName: line.product?.name ?? "",
                        calc: lineCalcText(line),
                        total: line.total.formatted(.currency(code: tenantCurrency)),
                        onEdit: {
                            editingLineIndex = idx
                        },
                        onDelete: {
                            model.removeLine(line)
                        }
                    )
                    .accessibilityIdentifier("wizard.line.\(line.id)")
                }
            }
            .padding(.top, 4)
        }
    }

    @ViewBuilder
    private var lineEditorSheet: some View {
        if let idx = editingLineIndex, model.lines.indices.contains(idx) {
            PurchaseWizardLineEditorSheet(
                line: $model.lines[idx],
                onSave: { editingLineIndex = nil },
                onCancel: { editingLineIndex = nil }
            )
        }
    }

    // MARK: - Sheets

    private var supplierPickerSheet: some View {
        SupplierPickerSheet(api: api) { picked in
            model.selectedSupplier = picked
            showSupplierPicker = false
        }
        .presentationDetents([.medium, .large])
    }

    private var warehousePickerSheet: some View {
        WarehousePickerSheet(api: api) { picked in
            model.selectedWarehouse = picked
            missingFields.remove(.warehouse)
            showWarehousePicker = false
        }
        .presentationDetents([.medium, .large])
    }

    private var productPickerSheet: some View {
        ProductPickerSheet(api: api) { product in
            showProductPicker = false
            pendingProduct = PendingProduct(product: product)
        }
        .presentationDetents([.medium, .large])
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

    // MARK: - Derived state

    private var canSaveDraft: Bool {
        !isPosting && model.canAdvance(from: .supplier)
    }

    private var canPost: Bool {
        !isPosting
            && model.canAdvance(from: .supplier)
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
                comment: ""
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

    private func lineCalcText(_ line: PurchaseInvoiceWizardModel.Line) -> String {
        let qty = line.quantity.formatted(.number)
        let price = line.price.formatted(.currency(code: tenantCurrency))
        return "\(qty) × \(price) ="
    }

    // MARK: - Async helpers

    private func autoSelectWarehouseIfSingle() async {
        guard model.selectedWarehouse == nil else { return }
        struct Req: APIRequest {
            typealias Response = CatalogListResponse
            let path = "/api/mobile/catalogs/inventory.warehouse"
            let method: HTTPMethod = .get
            let query: [String: String]? = [:]
        }
        guard let resp = try? await api.send(Req()) else { return }
        if resp.items.count == 1 {
            model.selectedWarehouse = resp.items[0]
        }
    }

    private func post() async {
        var missing: Set<MissingField> = []
        if model.selectedWarehouse == nil { missing.insert(.warehouse) }
        guard missing.isEmpty else {
            missingFields = missing
            return
        }
        missingFields = []

        isPosting = true
        defer { isPosting = false }
        do {
            try await poster?.post(model: model)
            dismiss()
        } catch {
            postError = String(describing: error)
        }
    }

    private func save() async {
        isPosting = true
        defer { isPosting = false }
        do {
            _ = try await poster?.saveDraft(model: model)
            dismiss()
        } catch {
            postError = String(describing: error)
        }
    }
}

private extension String {
    var localizedKey: LocalizedStringKey { LocalizedStringKey(self) }
}
