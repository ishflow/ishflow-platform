import APIClient
import AppShared
import Foundation
import Sales

/// Posts a finalized payment-sent wizard payload by calling the
/// document-create endpoint and chaining the post endpoint with
/// the returned id. The poster is `@MainActor`-isolated because
/// it reads non-Sendable `PaymentSentWizardModel` state and
/// tracks per-instance retry state.
///
/// **Idempotency:** if `create` succeeds but the subsequent `post`
/// call fails, `lastCreatedDocumentId` retains the new document's
/// id. A retry of `post(model:)` skips create and re-issues the
/// post request against the cached id, leaving the SAVED→POSTED
/// transition idempotent. The cache is cleared once both phases
/// succeed so the next payment starts fresh.
@MainActor
public final class PaymentSentWizardPoster {
    /// Errors raised when the wizard model is incomplete.
    public enum PostError: Error, Sendable {
        /// User did not pick a supplier.
        case noSupplier
        /// Header amount was zero or negative.
        case invalidAmount
    }

    private let api: any APIClient
    private var lastCreatedDocumentId: UUID?

    /// Create a poster bound to the given API client.
    public init(api: any APIClient) {
        self.api = api
    }

    /// Submit the wizard's contents as a posted payment-sent document.
    /// Two network round-trips: create then post-by-id. On retry after a
    /// partial failure (create OK, post failed), only the second
    /// round-trip is re-issued.
    public func post(model: PaymentSentWizardModel) async throws {
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
    public func saveDraft(model: PaymentSentWizardModel) async throws -> UUID {
        if let cached = lastCreatedDocumentId {
            return cached
        }
        let id = try await create(model: model, status: "DRAFT")
        lastCreatedDocumentId = id
        NotificationCenter.default.post(name: .ishflowDocumentsDidChange, object: nil)
        return id
    }

    /// Create the document and return its id. Validates the model.
    private func create(model: PaymentSentWizardModel, status: String = "SAVED") async throws -> UUID {
        guard let supplier = model.selectedSupplier else { throw PostError.noSupplier }
        guard model.amount > 0 else { throw PostError.invalidAmount }
        let dateString = ISO8601DateFormatter().string(from: model.date)
        let linkedInvoicesJSON: String? = model.linkedInvoices.isEmpty ? nil : encodeLinkedInvoices(model.linkedInvoices)
        let body = CreatePaymentSentBody(
            supplier: supplier.id.uuidString,
            date: dateString,
            amount: model.amount.description,
            note: model.comment.isEmpty ? nil : model.comment,
            linkedInvoices: linkedInvoicesJSON,
            status: status,
            attachmentDraftId: model.draftAttachmentId.uuidString
        )

        // swiftlint:disable nesting
        struct CreateReq: APIRequest {
            typealias Response = DocumentCreateResponse
            let path = "/api/mobile/documents/purchases.payment_sent"
            let method: HTTPMethod = .post
            let body: (any Encodable & Sendable)?
        }
        // swiftlint:enable nesting
        let createResp = try await api.send(CreateReq(body: body))
        return createResp.id
    }

    private func encodeLinkedInvoices(_ invoices: [LinkedInvoice]) -> String? {
        let items = invoices.map { ["invoiceId": $0.invoiceId.uuidString, "amount": NSDecimalNumber(decimal: $0.amount).doubleValue] }
        guard let data = try? JSONSerialization.data(withJSONObject: items) else { return nil }
        return String(data: data, encoding: .utf8)
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
            PostReq(path: "/api/mobile/documents/purchases.payment_sent/\(id.uuidString)/post")
        )
    }

    /// Encodable wire payload for `POST /api/mobile/documents/purchases.payment_sent`.
    /// Field names mirror `configs/purchases/documents/payment-sent.ts` exactly:
    /// `supplier` (UUID), `amount` (decimal string), `date` (ISO string), `note` (optional).
    private struct CreatePaymentSentBody: Encodable {
        let supplier: String
        let date: String
        let amount: String
        let note: String?
        let linkedInvoices: String?
        let status: String
        let attachmentDraftId: String?
    }
}
