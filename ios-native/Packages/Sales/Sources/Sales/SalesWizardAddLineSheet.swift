import AppShared
import SwiftUI

/// Modal shown after a product is picked from the search/picker — lets the
/// user enter quantity (and adjust the resolved unit price) before the line
/// lands in the wizard. Mirrors the Android `InlineProductLineDialog.Add`
/// mode so the two platforms feel the same.
///
/// The sheet keeps its own `quantity` / `unitPrice` state so cancelling
/// leaves the wizard model untouched. On Save, the parent calls
/// `SalesWizardModel.addLine(product:quantity:unitPrice:)` with the entered
/// values.
public struct SalesWizardAddLineSheet: View {
    public let productName: String
    public let initialPrice: Decimal
    public let currencyCode: String
    public let onCancel: () -> Void
    public let onAdd: (Decimal, Decimal) -> Void

    /// Optional so an empty `Miktar` field shows the "0" placeholder rather
    /// than a pre-filled value the user has to clear before typing. Posting
    /// is gated on `(quantity ?? 0) > 0`.
    @State private var quantity: Decimal?
    /// Same treatment for `Birim fiyat` — when the resolver returns 0 (no
    /// resolved price) the field shows the "0" placeholder instead of a
    /// pre-filled zero the user has to clear first.
    @State private var unitPrice: Decimal?
    @FocusState private var qtyFocused: Bool

    public init(
        productName: String,
        initialPrice: Decimal,
        currencyCode: String,
        onCancel: @escaping () -> Void,
        onAdd: @escaping (Decimal, Decimal) -> Void
    ) {
        self.productName = productName
        self.initialPrice = initialPrice
        self.currencyCode = currencyCode
        self.onCancel = onCancel
        self.onAdd = onAdd
        _unitPrice = State(wrappedValue: initialPrice > 0 ? initialPrice : nil)
    }

    public var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack {
                        Text("wizard.line.qty")
                        Spacer()
                        TextField("0", value: $quantity, format: .number)
                        #if os(iOS)
                            .keyboardType(.decimalPad)
                        #endif
                            .multilineTextAlignment(.trailing)
                            .focused($qtyFocused)
                            .accessibilityIdentifier("wizard.line.quantity")
                    }
                    HStack {
                        Text("wizard.line.unitPrice")
                        Spacer()
                        TextField("0", value: $unitPrice, format: .number)
                        #if os(iOS)
                            .keyboardType(.decimalPad)
                        #endif
                            .multilineTextAlignment(.trailing)
                            .accessibilityIdentifier("wizard.line.unitPrice")
                    }
                    LabeledContent("wizard.line.total") {
                        Text((quantity ?? 0) * (unitPrice ?? 0), format: .currency(code: currencyCode))
                            .foregroundStyle(.secondary)
                            .monospacedDigit()
                    }
                } header: {
                    Text(verbatim: productName)
                }
            }
            .navigationTitle("wizard.line.add")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("common.cancel", action: onCancel)
                        .accessibilityIdentifier("wizard.line.cancel")
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("wizard.add") {
                        onAdd(quantity ?? 0, unitPrice ?? 0)
                    }
                    .disabled((quantity ?? 0) <= 0)
                    .accessibilityIdentifier("wizard.line.save")
                }
            }
            .onAppear { qtyFocused = true }
        }
        .presentationDetents([.medium])
    }
}
