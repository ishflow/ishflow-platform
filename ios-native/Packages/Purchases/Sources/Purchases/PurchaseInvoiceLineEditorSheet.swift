import AppShared
import SwiftUI

/// Sheet for editing a single purchase-invoice line — quantity + price.
/// The product is set when the line is created via `ProductPickerSheet`
/// in `PurchaseInvoiceWizardView`. Mirrors `SalesWizardLineEditorSheet`
/// but binds to `PurchaseInvoiceWizardModel.Line` whose price field is
/// named `price` (NOT `unitPrice`) per `purchase-invoice.ts`.
public struct PurchaseInvoiceLineEditorSheet: View {
    @Binding var line: PurchaseInvoiceWizardModel.Line
    let onSave: () -> Void
    let onCancel: () -> Void

    public init(
        line: Binding<PurchaseInvoiceWizardModel.Line>,
        onSave: @escaping () -> Void,
        onCancel: @escaping () -> Void
    ) {
        _line = line
        self.onSave = onSave
        self.onCancel = onCancel
    }

    public var body: some View {
        NavigationStack {
            Form {
                Section(header: Text(line.product?.name ?? "")) {
                    HStack {
                        Text("wizard.line.qty")
                        Spacer()
                        TextField("0", value: $line.quantity, format: .number)
                        #if os(iOS)
                            .keyboardType(.decimalPad)
                        #endif
                            .multilineTextAlignment(.trailing)
                            .accessibilityIdentifier("wizard.line.quantity")
                    }
                    HStack {
                        Text("wizard.line.price")
                        Spacer()
                        TextField("0", value: $line.price, format: .number)
                        #if os(iOS)
                            .keyboardType(.decimalPad)
                        #endif
                            .multilineTextAlignment(.trailing)
                            .accessibilityIdentifier("wizard.line.price")
                    }
                    HStack {
                        Text("wizard.line.total")
                        Spacer()
                        Text(line.total, format: .number).foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("wizard.line.edit")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("common.cancel", action: onCancel)
                        .accessibilityIdentifier("wizard.line.cancel")
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("wizard.line.save", action: onSave)
                        .disabled(line.quantity <= 0 || line.product == nil)
                        .accessibilityIdentifier("wizard.line.save")
                }
            }
        }
    }
}
