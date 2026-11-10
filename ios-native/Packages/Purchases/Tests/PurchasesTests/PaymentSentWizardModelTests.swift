import AppShared
import Foundation
@testable import Purchases
import XCTest

@MainActor
final class PaymentSentWizardModelTests: XCTestCase {
    func testInitialState() {
        let model = PaymentSentWizardModel()
        XCTAssertEqual(model.step, .supplier)
        XCTAssertNil(model.selectedSupplier)
        XCTAssertEqual(model.amount, 0)
        XCTAssertEqual(model.comment, "")
        XCTAssertFalse(model.canAdvance(from: .supplier))
    }

    func testCanAdvanceFromSupplier_trueAfterPicking() throws {
        let model = PaymentSentWizardModel()
        model.selectedSupplier = try makeSupplier()
        XCTAssertTrue(model.canAdvance(from: .supplier))
    }

    func testCanAdvanceFromHeader_falseWhenAmountZero() throws {
        let model = PaymentSentWizardModel()
        model.selectedSupplier = try makeSupplier()
        model.amount = 0
        XCTAssertFalse(model.canAdvance(from: .header))
    }

    func testCanAdvanceFromHeader_trueWhenAmountPositive() throws {
        let model = PaymentSentWizardModel()
        model.selectedSupplier = try makeSupplier()
        model.amount = Decimal(string: "125.50") ?? 0
        XCTAssertTrue(model.canAdvance(from: .header))
    }

    func testCanAdvanceFromReview_alwaysTrue() {
        let model = PaymentSentWizardModel()
        XCTAssertTrue(model.canAdvance(from: .review))
    }

    private func makeSupplier() throws -> CatalogRecord {
        let json = Data("""
        {
            "id": "\(UUID().uuidString)",
            "code": "S1",
            "name": "Test supplier",
            "createdAt": "2026-04-26T10:00:00Z",
            "updatedAt": "2026-04-26T10:00:00Z"
        }
        """.utf8)
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(CatalogRecord.self, from: json)
    }
}
