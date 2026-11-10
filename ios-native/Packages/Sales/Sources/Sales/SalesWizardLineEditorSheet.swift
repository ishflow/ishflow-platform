import AppShared
import SwiftUI

public struct SalesWizardLineEditorSheet: View {
    @Binding var line: SalesWizardModel.Line
    let onSave: () -> Void
    let onCancel: () -> Void

    public var body: some View {
        NavigationStack {
            Form {
                Section(header: Text(line.product.name)) {
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
                        TextField("0", value: $line.unitPrice, format: .number)
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
                }
            }
            .navigationTitle("wizard.line.edit")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("common.cancel", action: onCancel)
                        .accessibilityIdentifier("wizard.line.cancel")
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("wizard.line.save", action: onSave).disabled(line.quantity <= 0)
                        .accessibilityIdentifier("wizard.line.save")
                }
            }
        }
    }
}
