import APIClient
import AppShared
import Foundation
import Observation

/// View model backing `DocumentDetailView`. Loads a single document by
/// kind + id from `/api/mobile/documents/<kind>/:id` and exposes the
/// resulting `DocumentRecord` through a small state enum. Used for
/// purchase invoices, payment received, and payment sent — sales
/// invoices have their own detail viewmodel that knows about the wizard.
@Observable
@MainActor
public final class DocumentDetailViewModel {
    public enum State {
        case loading
        case loaded(DocumentRecord)
        case failed(String)
    }

    public var state: State = .loading
    private let api: any APIClient
    private let kind: DocumentKind
    private let id: UUID

    public init(api: any APIClient, kind: DocumentKind, id: UUID) {
        self.api = api
        self.kind = kind
        self.id = id
    }

    public func load() async {
        state = .loading
        do {
            // swiftlint:disable nesting
            struct Req: APIRequest {
                typealias Response = DocumentRecord
                let path: String
                let method: HTTPMethod = .get
            }
            // swiftlint:enable nesting
            let resp = try await api.send(
                Req(path: "/api/mobile/documents/\(kind.rawValue)/\(id.uuidString)")
            )
            state = .loaded(resp)
        } catch {
            state = .failed(String(describing: error))
        }
    }
}
