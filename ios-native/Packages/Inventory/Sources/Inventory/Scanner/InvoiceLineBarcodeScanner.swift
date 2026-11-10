import APIClient
import AppShared
import SwiftUI

/// Scanner sheet that captures a barcode, looks up the product via the
/// mobile API, and invokes `onProduct` when a match is found.
public struct InvoiceLineBarcodeScanner: View {
    private let api: any APIClient
    private let onProduct: (CatalogRecord) -> Void
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var scannedCode: String?
    @Environment(\.dismiss) private var dismiss

    public init(api: any APIClient, onProduct: @escaping (CatalogRecord) -> Void) {
        self.api = api
        self.onProduct = onProduct
    }

    public var body: some View {
        NavigationStack {
            ZStack {
                BarcodeScanView { code in
                    guard scannedCode == nil else { return }
                    scannedCode = code
                    Task { await lookup(code) }
                }
                .ignoresSafeArea()

                if isLoading {
                    ProgressView()
                        .scaleEffect(1.5)
                        .padding(24)
                        .background(.ultraThinMaterial)
                        .cornerRadius(12)
                }
            }
            .navigationTitle("field.barcode.scanTitle")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("common.cancel") { dismiss() }
                }
            }
            .alert("field.barcode.notFound", isPresented: .constant(errorMessage != nil)) {
                Button("common.ok") { errorMessage = nil; scannedCode = nil }
            } message: {
                Text(errorMessage ?? "")
            }
        }
    }

    private func lookup(_ code: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            struct Req: APIRequest {
                typealias Response = CatalogRecord
                let path = "/api/mobile/products/by-barcode"
                let method: HTTPMethod = .get
                let query: [String: String]?
            }
            let product = try await api.send(Req(query: ["barcode": code]))
            dismiss()
            onProduct(product)
        } catch {
            errorMessage = String(describing: error)
        }
    }
}
