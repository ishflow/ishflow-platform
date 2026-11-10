import AppShared
import SwiftUI

/// Modal sheet that edits one purchase-invoice line (quantity + unit price)
/// in place via a `@Binding`. Mirrors `SalesWizardLineEditorSheet` but for
/// the purchase model.
public struct PurchaseWizardLineEditorSheet: View {
    @Binding var line: PurchaseInvoiceWizardModel.Line
    let onSave: () -> Void
    let onCancel: () -> Void

    public var body: some View {
        NavigationStack {
            Form {
                Section {
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
                        Text("wizard.line.unitPrice")
                        Spacer()
                        TextField("0", value: $line.price, format: .number)
                        #if os(iOS)
                            .keyboardType(.decimalPad)
                        #endif
                            .multilineTextAlignment(.trailing)
                            .accessibilityIdentifier("wizard.line.unitPrice")
                    }
                    HStack {
                        Text("wizard.line.total")
                        Spacer()
                        Text(line.total, format: .number).foregroundStyle(.secondary)
                    }
                } header: {
                    Text(verbatim: line.product?.name ?? "")
                }
            }
            .navigationTitle("wizard.line.edit")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("common.cancel", action: onCancel)
                        .accessibilityIdentifier("wizard.line.cancel")
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("wizard.line.save", action: onSave)
                        .disabled(line.quantity <= 0)
                        .accessibilityIdentifier("wizard.line.save")
                }
            }
        }
        .presentationDetents([.medium])
    }
}
