import AppShared
import Foundation
@testable import Sales
import XCTest

@MainActor
final class PaymentReceivedWizardModelTests: XCTestCase {
    func testInitialState() {
        let model = PaymentReceivedWizardModel()
        XCTAssertEqual(model.step, .customer)
        XCTAssertNil(model.selectedCustomer)
        XCTAssertEqual(model.amount, 0)
        XCTAssertEqual(model.comment, "")
        XCTAssertFalse(model.canAdvance(from: .customer))
    }

    func testCanAdvanceFromCustomer_trueAfterPicking() throws {
        let model = PaymentReceivedWizardModel()
        model.selectedCustomer = try makeCustomer()
        XCTAssertTrue(model.canAdvance(from: .customer))
    }

    func testCanAdvanceFromHeader_falseWhenAmountZero() throws {
        let model = PaymentReceivedWizardModel()
        model.selectedCustomer = try makeCustomer()
        model.amount = 0
        XCTAssertFalse(model.canAdvance(from: .header))
    }

    func testCanAdvanceFromHeader_trueWhenAmountPositive() throws {
        let model = PaymentReceivedWizardModel()
        model.selectedCustomer = try makeCustomer()
        model.amount = Decimal(string: "125.50") ?? 0
        XCTAssertTrue(model.canAdvance(from: .header))
    }

    func testCanAdvanceFromReview_alwaysTrue() {
        let model = PaymentReceivedWizardModel()
        XCTAssertTrue(model.canAdvance(from: .review))
    }

    private func makeCustomer() throws -> CatalogRecord {
        let json = Data("""
        {
            "id": "\(UUID().uuidString)",
            "code": "C1",
            "name": "Test customer",
            "createdAt": "2026-04-26T10:00:00Z",
            "updatedAt": "2026-04-26T10:00:00Z"
        }
        """.utf8)
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(CatalogRecord.self, from: json)
    }
}
