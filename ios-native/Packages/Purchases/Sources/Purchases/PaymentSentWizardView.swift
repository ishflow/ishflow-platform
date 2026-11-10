import APIClient
import AppShared
import Core
import Sales
import SwiftUI

/// Single-screen `purchases.payment_sent` entry redesigned to the wizard
/// "Variant A · Liquid Mirror" pattern shared with `SalesWizardView`:
///
///   - NavigationStack with inline title + draft chip
///   - Sticky action row + sticky total bar (amber tint, money-out)
///   - Scroll body: date chip → numbered supplier → inline amount card →
///     linked-invoices card → optional note
///
/// Mirror of `PaymentReceivedWizardView` but for outgoing money against a
/// supplier (counterparty type swap + tint swap).
public struct PaymentSentWizardView: View {
    private let api: any APIClient
    @State private var model = PaymentSentWizardModel()
    @State private var showSupplierPicker = false
    @State private var showDatePicker = false
    @State private var postError: String?
    @State private var isPosting = false
    @State private var poster: PaymentSentWizardPoster?
    @State private var missingFields: Set<MissingField> = []
    @FocusState private var amountFocused: Bool
    @Environment(AppSession.self) private var session
    @Environment(\.dismiss) private var dismiss

    private enum MissingField: Hashable {
        case supplier
        case amount
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

                    amountCard
                    commentCard

                    AttachmentSection(
                        entity: "purchases.payment_sent",
                        entityId: model.draftAttachmentId,
                        api: api
                    )
                    .padding(.top, 8)

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
                        Text("wizard.paymentSent.title")
                            .font(.system(size: 17, weight: .semibold))
                        WizardDraftChip()
                    }
                }
            }
            .sheet(isPresented: $showSupplierPicker) { supplierPickerSheet }
            .sheet(isPresented: $showDatePicker) { datePickerSheet }
        }
        .task {
            if poster == nil { poster = PaymentSentWizardPoster(api: api) }
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
                label: NSLocalizedString("wizard.total.amount", value: "Amount", comment: ""),
                value: model.amount.formatted(.currency(code: tenantCurrency)),
                dim: model.amount <= 0,
                tint: .orange
            )
            Divider().opacity(0.5)
        }
        .background(.bar)
    }

    // MARK: - Body cards

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
            Spacer(minLength: 0)
        }
    }

    private var amountCard: some View {
        HStack(alignment: .lastTextBaseline) {
            VStack(alignment: .leading, spacing: 4) {
                Text("wizard.amount.title")
                    .font(WizardTokens.labelFont)
                    .tracking(0.4)
                    .textCase(.uppercase)
                    .foregroundStyle(.secondary)
                TextField(
                    "wizard.amount.placeholder",
                    value: optionalDecimalBinding($model.amount),
                    format: .number
                )
                #if os(iOS)
                .keyboardType(.decimalPad)
                #endif
                .font(.system(size: 28, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .focused($amountFocused)
                .accessibilityIdentifier("wizard.amount.field")
            }
            Spacer()
            Text(tenantCurrency)
                .font(.title3.weight(.medium))
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: WizardTokens.cardRadius, style: .continuous)
                .fill(.ultraThinMaterial)
        )
        .overlay(
            RoundedRectangle(cornerRadius: WizardTokens.cardRadius, style: .continuous)
                .strokeBorder(
                    missingFields.contains(.amount)
                        ? Color.red.opacity(0.55)
                        : Color.orange.opacity(0.35),
                    lineWidth: 0.8
                )
        )
    }

    private var commentCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("wizard.header.comment")
                .font(WizardTokens.labelFont)
                .tracking(0.4)
                .textCase(.uppercase)
                .foregroundStyle(.secondary)
            TextField(
                "wizard.comment.placeholder",
                text: $model.comment,
                axis: .vertical
            )
            .lineLimit(1 ... 3)
            .font(WizardTokens.valueFont)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: WizardTokens.cardRadius, style: .continuous)
                .fill(.ultraThinMaterial)
        )
        .overlay(
            RoundedRectangle(cornerRadius: WizardTokens.cardRadius, style: .continuous)
                .strokeBorder(WizardTokens.solidStroke, lineWidth: 0.8)
        )
    }

    // MARK: - Sheets

    private var supplierPickerSheet: some View {
        SupplierPickerSheet(api: api) { picked in
            model.selectedSupplier = picked
            missingFields.remove(.supplier)
            showSupplierPicker = false
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
        !isPosting && model.canAdvance(from: .supplier)
    }

    private var dateChipText: String {
        model.date.formatted(.dateTime.day().month(.abbreviated))
    }

    private var tenantCurrency: String {
        session.tenant?.currency ?? "USD"
    }

    private func optionalDecimalBinding(_ source: Binding<Decimal>) -> Binding<Decimal?> {
        Binding<Decimal?>(
            get: { source.wrappedValue == 0 ? nil : source.wrappedValue },
            set: { source.wrappedValue = $0 ?? 0 }
        )
    }

    // MARK: - Actions

    private func post() async {
        var missing: Set<MissingField> = []
        if model.selectedSupplier == nil { missing.insert(.supplier) }
        if model.amount <= 0 { missing.insert(.amount) }
        guard missing.isEmpty else {
            missingFields = missing
            if missing.contains(.amount) { amountFocused = true }
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
