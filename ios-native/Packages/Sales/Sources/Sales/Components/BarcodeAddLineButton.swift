import APIClient
import AppShared
import Inventory
import SwiftUI

/// Button that opens a barcode scanner and invokes `onProductSelected`
/// when a product is successfully looked up.
public struct BarcodeAddLineButton: View {
    private let api: any APIClient
    private let onProductSelected: (CatalogRecord) -> Void
    @State private var showScanner = false

    public init(api: any APIClient, onProductSelected: @escaping (CatalogRecord) -> Void) {
        self.api = api
        self.onProductSelected = onProductSelected
    }

    public var body: some View {
        Button {
            showScanner = true
        } label: {
            Label("field.barcode.scan", systemImage: "barcode.viewfinder")
        }
        .sheet(isPresented: $showScanner) {
            InvoiceLineBarcodeScanner(api: api) { product in
                showScanner = false
                onProductSelected(product)
            }
        }
    }
}
