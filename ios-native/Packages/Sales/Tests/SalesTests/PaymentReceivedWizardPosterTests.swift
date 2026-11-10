import APIClient
import AppShared
import Foundation
@testable import Sales
import XCTest

@MainActor
final class PaymentReceivedWizardPosterTests: XCTestCase {
    func testPostHappyPath() async throws {
        let docId = UUID()
        let mock = MockAPIClient(responses: [
            .documentCreate(id: docId),
            .documentPost(movementCount: 1)
        ])
        let poster = PaymentReceivedWizardPoster(api: mock)
        let model = try makeFilledModel()

        try await poster.post(model: model)

        let count = await mock.callCount
        XCTAssertEqual(count, 2)
    }

    func testPostRetrySkipsCreateAfterPartialFailure() async throws {
        let docId = UUID()
        let mock = MockAPIClient(responses: [
            .documentCreate(id: docId),
            .error(URLError(.badServerResponse)),
            .documentPost(movementCount: 1)
        ])
        let poster = PaymentReceivedWizardPoster(api: mock)
        let model = try makeFilledModel()

        do {
            try await poster.post(model: model)
            XCTFail("expected failure on first attempt")
        } catch {
            // expected — the second response is an error
        }

        try await poster.post(model: model)

        // Total calls: create + failed post + (no create) + successful post = 3
        let count = await mock.callCount
        XCTAssertEqual(count, 3)
    }

    func testSaveDraftCallsCreateOnceAndReturnsId() async throws {
        let docId = UUID()
        let mock = MockAPIClient(responses: [
            .documentCreate(id: docId)
        ])
        let poster = PaymentReceivedWizardPoster(api: mock)
        let model = try makeFilledModel()

        let firstId = try await poster.saveDraft(model: model)
        XCTAssertEqual(firstId, docId)

        let secondId = try await poster.saveDraft(model: model)
        XCTAssertEqual(secondId, docId)

        let count = await mock.callCount
        XCTAssertEqual(count, 1)
    }

    func testPostFailsWhenCustomerMissing() async throws {
        let mock = MockAPIClient(responses: [])
        let poster = PaymentReceivedWizardPoster(api: mock)
        let model = PaymentReceivedWizardModel()
        model.amount = 100

        do {
            try await poster.post(model: model)
            XCTFail("expected PostError.noCustomer")
        } catch PaymentReceivedWizardPoster.PostError.noCustomer {
            // expected
        }

        let count = await mock.callCount
        XCTAssertEqual(count, 0)
    }

    func testPostFailsWhenAmountZero() async throws {
        let mock = MockAPIClient(responses: [])
        let poster = PaymentReceivedWizardPoster(api: mock)
        let model = PaymentReceivedWizardModel()
        model.selectedCustomer = try decodeCatalogRecord(code: "C1", name: "Test customer")
        model.amount = 0

        do {
            try await poster.post(model: model)
            XCTFail("expected PostError.invalidAmount")
        } catch PaymentReceivedWizardPoster.PostError.invalidAmount {
            // expected
        }

        let count = await mock.callCount
        XCTAssertEqual(count, 0)
    }

    private func makeFilledModel() throws -> PaymentReceivedWizardModel {
        let model = PaymentReceivedWizardModel()
        model.selectedCustomer = try decodeCatalogRecord(code: "C1", name: "Test customer")
        model.amount = Decimal(string: "150.00") ?? 0
        model.comment = "test note"
        return model
    }

    private func decodeCatalogRecord(code: String, name: String) throws -> CatalogRecord {
        let json = Data("""
        {
            "id": "\(UUID().uuidString)",
            "code": "\(code)",
            "name": "\(name)",
            "createdAt": "2026-04-26T10:00:00Z",
            "updatedAt": "2026-04-26T10:00:00Z"
        }
        """.utf8)
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(CatalogRecord.self, from: json)
    }
}

/// Test double for `APIClient` that returns a queued sequence of pre-canned
/// responses or errors. Implemented as an `actor` so concurrent `send` calls
/// are serialized and the protocol's `Sendable` requirement is satisfied
/// without `@unchecked Sendable`.
private actor MockAPIClient: APIClient {
    enum Response {
        case documentCreate(id: UUID)
        case documentPost(movementCount: Int)
        case error(Error)
    }

    private var queue: [Response]
    private(set) var callCount = 0

    init(responses: [Response]) {
        queue = responses
    }

    func send<R: APIRequest>(_: R) async throws -> R.Response {
        callCount += 1
        guard !queue.isEmpty else {
            throw URLError(.unknown)
        }
        let next = queue.removeFirst()
        switch next {
        case let .documentCreate(id):
            let json = Data("""
            {
                "id": "\(id.uuidString)",
                "record": {
                    "id": "\(id.uuidString)",
                    "number": "PR-1",
                    "date": "2026-04-26T10:00:00Z",
                    "status": "SAVED",
                    "createdAt": "2026-04-26T10:00:00Z",
                    "updatedAt": "2026-04-26T10:00:00Z"
                }
            }
            """.utf8)
            return try JSONDecoder.ishflow.decode(R.Response.self, from: json)
        case let .documentPost(movementCount):
            let json = Data(#"{"movementCount":\#(movementCount)}"#.utf8)
            return try JSONDecoder.ishflow.decode(R.Response.self, from: json)
        case let .error(err):
            throw err
        }
    }
}
