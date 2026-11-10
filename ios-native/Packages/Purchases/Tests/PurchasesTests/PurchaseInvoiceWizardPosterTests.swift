import APIClient
import AppShared
import Foundation
@testable import Purchases
import XCTest

@MainActor
final class PurchaseInvoiceWizardPosterTests: XCTestCase {
    func testPostHappyPath() async throws {
        let docId = UUID()
        let mock = MockAPIClient(responses: [
            .documentCreate(id: docId),
            .documentPost(movementCount: 2)
        ])
        let poster = PurchaseInvoiceWizardPoster(api: mock)
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
            .documentPost(movementCount: 2)
        ])
        let poster = PurchaseInvoiceWizardPoster(api: mock)
        let model = try makeFilledModel()

        do {
            try await poster.post(model: model)
            XCTFail("expected failure on first attempt")
        } catch {
            // expected — second response is an error
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
        let poster = PurchaseInvoiceWizardPoster(api: mock)
        let model = try makeFilledModel()

        let firstId = try await poster.saveDraft(model: model)
        XCTAssertEqual(firstId, docId)

        let secondId = try await poster.saveDraft(model: model)
        XCTAssertEqual(secondId, docId)

        let count = await mock.callCount
        XCTAssertEqual(count, 1)
    }

    func testPostFailsWhenSupplierMissing() async throws {
        let mock = MockAPIClient(responses: [])
        let poster = PurchaseInvoiceWizardPoster(api: mock)
        let model = PurchaseInvoiceWizardModel()
        // Warehouse + lines provided but no supplier.
        model.selectedWarehouse = try decodeCatalogRecord(code: "WH1", name: "Main")
        let product = try decodeCatalogRecord(code: "P1", name: "Test product")
        model.addLine(product: product, quantity: 1, price: 5)

        do {
            try await poster.post(model: model)
            XCTFail("expected PostError.noSupplier")
        } catch PurchaseInvoiceWizardPoster.PostError.noSupplier {
            // expected
        }

        let count = await mock.callCount
        XCTAssertEqual(count, 0)
    }

    func testPostFailsWhenWarehouseMissing() async throws {
        let mock = MockAPIClient(responses: [])
        let poster = PurchaseInvoiceWizardPoster(api: mock)
        let model = PurchaseInvoiceWizardModel()
        model.selectedSupplier = try decodeCatalogRecord(code: "S1", name: "Acme")
        let product = try decodeCatalogRecord(code: "P1", name: "Test product")
        model.addLine(product: product, quantity: 1, price: 5)

        do {
            try await poster.post(model: model)
            XCTFail("expected PostError.noWarehouse")
        } catch PurchaseInvoiceWizardPoster.PostError.noWarehouse {
            // expected
        }

        let count = await mock.callCount
        XCTAssertEqual(count, 0)
    }

    func testPostFailsWhenLinesEmpty() async throws {
        let mock = MockAPIClient(responses: [])
        let poster = PurchaseInvoiceWizardPoster(api: mock)
        let model = PurchaseInvoiceWizardModel()
        model.selectedSupplier = try decodeCatalogRecord(code: "S1", name: "Acme")
        model.selectedWarehouse = try decodeCatalogRecord(code: "WH1", name: "Main")

        do {
            try await poster.post(model: model)
            XCTFail("expected PostError.noLines")
        } catch PurchaseInvoiceWizardPoster.PostError.noLines {
            // expected
        }

        let count = await mock.callCount
        XCTAssertEqual(count, 0)
    }

    func testPostFailsWhenLineMissingProduct() async throws {
        let mock = MockAPIClient(responses: [])
        let poster = PurchaseInvoiceWizardPoster(api: mock)
        let model = PurchaseInvoiceWizardModel()
        model.selectedSupplier = try decodeCatalogRecord(code: "S1", name: "Acme")
        model.selectedWarehouse = try decodeCatalogRecord(code: "WH1", name: "Main")
        // Append a blank line — product is nil.
        model.addLine(product: nil, quantity: 1, price: 5)

        do {
            try await poster.post(model: model)
            XCTFail("expected PostError.invalidLine")
        } catch PurchaseInvoiceWizardPoster.PostError.invalidLine {
            // expected
        }

        let count = await mock.callCount
        XCTAssertEqual(count, 0)
    }

    private func makeFilledModel() throws -> PurchaseInvoiceWizardModel {
        let model = PurchaseInvoiceWizardModel()
        model.selectedSupplier = try decodeCatalogRecord(code: "S1", name: "Acme Supplies")
        model.selectedWarehouse = try decodeCatalogRecord(code: "WH1", name: "Main warehouse")
        let product = try decodeCatalogRecord(code: "P1", name: "Test product")
        model.addLine(product: product, quantity: 2, price: Decimal(string: "9.50") ?? 0)
        return model
    }

    private func decodeCatalogRecord(code: String, name: String) throws -> CatalogRecord {
        let json = Data("""
        {
            "id": "\(UUID().uuidString)",
            "code": "\(code)",
            "name": "\(name)",
            "createdAt": "2026-04-29T10:00:00Z",
            "updatedAt": "2026-04-29T10:00:00Z"
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
                    "number": "PI-1",
                    "date": "2026-04-29T10:00:00Z",
                    "status": "SAVED",
                    "createdAt": "2026-04-29T10:00:00Z",
                    "updatedAt": "2026-04-29T10:00:00Z"
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
