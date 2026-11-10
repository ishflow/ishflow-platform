import APIClient
import AppShared
import Foundation

/// Posts a finalized purchase-invoice wizard payload by calling the
/// document-create endpoint and chaining the post endpoint with
/// the returned id. The poster is `@MainActor`-isolated because
/// it reads non-Sendable `PurchaseInvoiceWizardModel` state and
/// tracks per-instance retry state.
///
/// **Idempotency:** if `create` succeeds but the subsequent `post`
/// call fails, `lastCreatedDocumentId` retains the new document's
/// id. A retry of `post(model:)` skips create and re-issues the
/// post request against the cached id, leaving the SAVED→POSTED
/// transition idempotent. The cache is cleared once both phases
/// succeed so the next invoice starts fresh.
@MainActor
public final class PurchaseInvoiceWizardPoster {
    /// Errors raised when the wizard model is incomplete.
    public enum PostError: Error, Sendable {
        /// User did not pick a supplier.
        case noSupplier
        /// User did not pick a warehouse.
        case noWarehouse
        /// User added zero lines.
        case noLines
        /// At least one line is missing a product, has non-positive quantity,
        /// or has a negative price.
        case invalidLine
    }

    private let api: any APIClient
    private var lastCreatedDocumentId: UUID?

    /// Create a poster bound to the given API client.
    public init(api: any APIClient) {
        self.api = api
    }

    /// Submit the wizard's contents as a posted purchase invoice. Two
    /// network round-trips: create then post-by-id. On retry after a
    /// partial failure (create OK, post failed), only the second
    /// round-trip is re-issued.
    public func post(model: PurchaseInvoiceWizardModel) async throws {
        let id: UUID
        if let cached = lastCreatedDocumentId {
            id = cached
        } else {
            id = try await create(model: model)
            lastCreatedDocumentId = id
        }
        do {
            try await postExisting(id: id)
        } catch {
            if case let APIError.http(status, _) = error, (400 ..< 500).contains(status) {
                lastCreatedDocumentId = nil
            }
            throw error
        }
        lastCreatedDocumentId = nil
        NotificationCenter.default.post(name: .ishflowDocumentsDidChange, object: nil)
    }

    /// Save the wizard's contents as a draft (status=DRAFT). Returns the
    /// created document id. Idempotent: if called again, returns the
    /// cached id from the first successful create.
    public func saveDraft(model: PurchaseInvoiceWizardModel) async throws -> UUID {
        if let cached = lastCreatedDocumentId {
            return cached
        }
        let id = try await create(model: model, status: "DRAFT")
        lastCreatedDocumentId = id
        NotificationCenter.default.post(name: .ishflowDocumentsDidChange, object: nil)
        return id
    }

    /// Create the document and return its id. Validates the model.
    private func create(
        model: PurchaseInvoiceWizardModel,
        status: String = "SAVED"
    ) async throws -> UUID {
        guard let supplier = model.selectedSupplier else { throw PostError.noSupplier }
        guard let warehouse = model.selectedWarehouse else { throw PostError.noWarehouse }
        guard !model.lines.isEmpty else { throw PostError.noLines }
        let lineDTOs: [CreatePurchaseInvoiceLineDTO] = try model.lines.map { line in
            guard let product = line.product, line.quantity > 0, line.price >= 0 else {
                throw PostError.invalidLine
            }
            return CreatePurchaseInvoiceLineDTO(
                product: product.id.uuidString,
                quantity: line.quantity.description,
                price: line.price.description
            )
        }
        let dateString = ISO8601DateFormatter().string(from: model.date)
        let body = CreatePurchaseInvoiceBody(
            date: dateString,
            supplier: supplier.id.uuidString,
            warehouse: warehouse.id.uuidString,
            status: status,
            lines: lineDTOs
        )

        // swiftlint:disable nesting
        struct CreateReq: APIRequest {
            typealias Response = DocumentCreateResponse
            let path = "/api/mobile/documents/purchases.invoice"
            let method: HTTPMethod = .post
            let body: (any Encodable & Sendable)?
        }
        // swiftlint:enable nesting
        let createResp = try await api.send(CreateReq(body: body))
        return createResp.id
    }

    /// Transition an existing SAVED document to POSTED.
    private func postExisting(id: UUID) async throws {
        // swiftlint:disable nesting
        struct PostReq: APIRequest {
            typealias Response = DocumentPostResponse
            let path: String
            let method: HTTPMethod = .post
        }
        // swiftlint:enable nesting
        _ = try await api.send(
            PostReq(path: "/api/mobile/documents/purchases.invoice/\(id.uuidString)/post")
        )
    }

    /// Encodable wire payload for `POST /api/mobile/documents/purchases.invoice`.
    /// Field names mirror `configs/purchases/documents/purchase-invoice.ts` exactly:
    /// `date` (ISO string), `supplier` (UUID), `warehouse` (UUID), `lines`.
    private struct CreatePurchaseInvoiceBody: Encodable {
        let date: String
        let supplier: String
        let warehouse: String
        let status: String
        let lines: [CreatePurchaseInvoiceLineDTO]
    }
}

/// Encodable wire line payload for purchase-invoice lines. File-private to
/// keep nesting depth shallow (SwiftLint `nesting` rule limits nested types
/// to one level). Field name is `price` per the backend DSL — NOT `unitPrice`.
private struct CreatePurchaseInvoiceLineDTO: Encodable {
    let product: String
    let quantity: String
    let price: String
}
