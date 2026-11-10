import APIClient
import AppShared
import Foundation

/// DEBUG-only log — @autoclosure keeps PII/business strings (customer id, invoice
/// body) out of release builds. Finding G-iOS2.
private func dlog(_ message: @autoclosure () -> String) {
    #if DEBUG
    print(message())
    #endif
}

/// Posts a finalized sales-invoice wizard payload by calling the
/// document-create endpoint and chaining the post endpoint with
/// the returned id. The poster is `@MainActor`-isolated because
/// it reads non-Sendable `SalesWizardModel` state and tracks
/// per-instance retry state.
///
/// **Idempotency:** if `create` succeeds but the subsequent `post`
/// call fails, `lastCreatedDocumentId` retains the new document's
/// id. A retry of `post(model:)` skips create and re-issues the
/// post request against the cached id, leaving the SAVED→POSTED
/// transition idempotent. The cache is cleared once both phases
/// succeed so the next invoice starts fresh.
@MainActor
public final class SalesWizardPoster {
    /// Errors raised when the wizard model is incomplete.
    public enum PostError: Error, Sendable {
        /// User did not pick a customer.
        case noCustomer
        /// User added zero lines.
        case noLines
    }

    private let api: any APIClient
    private var lastCreatedDocumentId: UUID?

    /// Create a poster bound to the given API client.
    public init(api: any APIClient) {
        self.api = api
    }

    /// Submit the wizard's contents as a posted sales invoice. Two
    /// network round-trips: create then post-by-id. On retry after a
    /// partial failure (create OK, post failed), only the second
    /// round-trip is re-issued.
    public func post(model: SalesWizardModel) async throws {
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
    public func saveDraft(model: SalesWizardModel) async throws -> UUID {
        if let cached = lastCreatedDocumentId {
            return cached
        }
        let id = try await create(model: model, status: "DRAFT")
        lastCreatedDocumentId = id
        NotificationCenter.default.post(name: .ishflowDocumentsDidChange, object: nil)
        return id
    }

    /// Create the document and return its id. Validates the model.
    private func create(model: SalesWizardModel, status: String = "SAVED") async throws -> UUID {
        guard let customer = model.customer else { throw PostError.noCustomer }
        guard !model.lines.isEmpty else { throw PostError.noLines }
        let dateString = ISO8601DateFormatter().string(from: model.date)
        let lineDTOs = model.lines.map { line in
            CreateInvoiceLineDTO(
                productId: line.product.id.uuidString,
                quantity: line.quantity.description,
                unitPrice: line.unitPrice.description
            )
        }
        let body = CreateInvoiceBody(
            customerId: customer.id.uuidString,
            date: dateString,
            warehouseId: model.warehouse?.id.uuidString,
            priceTypeId: model.priceType?.id.uuidString,
            comment: model.comment.isEmpty ? nil : model.comment,
            status: status,
            attachmentDraftId: model.draftAttachmentId.uuidString,
            lines: lineDTOs
        )
        dlog("[SalesWizardPoster] POST body: customer=\(body.customerId) date=\(body.date) status=\(body.status) lines=\(body.lines.count)")

        // swiftlint:disable nesting
        struct CreateReq: APIRequest {
            typealias Response = DocumentCreateResponse
            let path = "/api/mobile/documents/sales.invoice"
            let method: HTTPMethod = .post
            let body: (any Encodable & Sendable)?
        }
        // swiftlint:enable nesting
        do {
            let createResp = try await api.send(CreateReq(body: body))
            dlog("[SalesWizardPoster] create success id=\(createResp.id)")
            return createResp.id
        } catch {
            dlog("[SalesWizardPoster] create error: \(error)")
            throw error
        }
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
            PostReq(path: "/api/mobile/documents/sales.invoice/\(id.uuidString)/post")
        )
    }

    /// Encodable wire payload for `POST /api/mobile/documents/sales.invoice`.
    private struct CreateInvoiceBody: Encodable {
        let customerId: String
        let date: String
        let warehouseId: String?
        let priceTypeId: String?
        let comment: String?
        let status: String
        let attachmentDraftId: String?
        let lines: [CreateInvoiceLineDTO]
    }
}

/// Encodable wire line payload. File-private to keep nesting depth shallow
/// (SwiftLint nesting rule limits nested types to 1 level).
private struct CreateInvoiceLineDTO: Encodable {
    let productId: String
    let quantity: String
    let unitPrice: String
}
