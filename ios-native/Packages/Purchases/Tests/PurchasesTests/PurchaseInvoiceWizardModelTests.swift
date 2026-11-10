import AppShared
import Foundation
@testable import Purchases
import XCTest

@MainActor
final class PurchaseInvoiceWizardModelTests: XCTestCase {
    func testInitialState() {
        let model = PurchaseInvoiceWizardModel()
        XCTAssertEqual(model.step, .supplier)
        XCTAssertNil(model.selectedSupplier)
        XCTAssertNil(model.selectedWarehouse)
        XCTAssertTrue(model.lines.isEmpty)
        XCTAssertFalse(model.canAdvance(from: .supplier))
    }

    func testCanAdvanceFromSupplier_trueAfterPicking() throws {
        let model = PurchaseInvoiceWizardModel()
        model.selectedSupplier = try makeRecord(code: "S1", name: "Acme Supplies")
        XCTAssertTrue(model.canAdvance(from: .supplier))
    }

    func testCanAdvanceFromHeader_falseWhenNoWarehouse() throws {
        let model = PurchaseInvoiceWizardModel()
        model.selectedSupplier = try makeRecord(code: "S1", name: "Acme")
        XCTAssertNil(model.selectedWarehouse)
        XCTAssertFalse(model.canAdvance(from: .header))
    }

    func testCanAdvanceFromHeader_trueWhenWarehousePicked() throws {
        let model = PurchaseInvoiceWizardModel()
        model.selectedSupplier = try makeRecord(code: "S1", name: "Acme")
        model.selectedWarehouse = try makeRecord(code: "WH1", name: "Main warehouse")
        XCTAssertTrue(model.canAdvance(from: .header))
    }

    func testCanAdvanceFromLines_falseWhenEmpty() throws {
        let model = PurchaseInvoiceWizardModel()
        model.selectedSupplier = try makeRecord(code: "S1", name: "Acme")
        model.selectedWarehouse = try makeRecord(code: "WH1", name: "Main warehouse")
        XCTAssertFalse(model.canAdvance(from: .lines))
    }

    func testCanAdvanceFromLines_trueWithOneValidLine() throws {
        let model = PurchaseInvoiceWizardModel()
        model.selectedSupplier = try makeRecord(code: "S1", name: "Acme")
        model.selectedWarehouse = try makeRecord(code: "WH1", name: "Main")
        let product = try makeRecord(code: "P1", name: "Test product")
        model.addLine(product: product, quantity: 2, price: Decimal(string: "9.50") ?? 0)
        XCTAssertTrue(model.canAdvance(from: .lines))
    }

    func testCanAdvanceFromLines_falseWhenLineMissingProduct() throws {
        let model = PurchaseInvoiceWizardModel()
        model.selectedSupplier = try makeRecord(code: "S1", name: "Acme")
        model.selectedWarehouse = try makeRecord(code: "WH1", name: "Main")
        // Append a blank line — product is nil.
        model.addLine(product: nil, quantity: 1, price: 1)
        XCTAssertFalse(model.canAdvance(from: .lines))
    }

    func testCanAdvanceFromLines_falseWhenQuantityZero() throws {
        let model = PurchaseInvoiceWizardModel()
        model.selectedSupplier = try makeRecord(code: "S1", name: "Acme")
        model.selectedWarehouse = try makeRecord(code: "WH1", name: "Main")
        let product = try makeRecord(code: "P1", name: "Test product")
        model.addLine(product: product, quantity: 0, price: 1)
        XCTAssertFalse(model.canAdvance(from: .lines))
    }

    func testCanAdvanceFromReview_alwaysTrue() {
        let model = PurchaseInvoiceWizardModel()
        XCTAssertTrue(model.canAdvance(from: .review))
    }

    func testRemoveLine_dropsMatchingId() throws {
        let model = PurchaseInvoiceWizardModel()
        let product = try makeRecord(code: "P1", name: "Test product")
        model.addLine(product: product, quantity: 1, price: 1)
        let line = model.lines[0]
        model.removeLine(line)
        XCTAssertTrue(model.lines.isEmpty)
    }

    func testLineTotal_isQuantityTimesPrice() throws {
        let product = try makeRecord(code: "P1", name: "Widget")
        let line = PurchaseInvoiceWizardModel.Line(
            product: product,
            quantity: Decimal(string: "3") ?? 0,
            price: Decimal(string: "12.50") ?? 0
        )
        XCTAssertEqual(line.total, Decimal(string: "37.50"))
    }

    private func makeRecord(code: String, name: String) throws -> CatalogRecord {
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
