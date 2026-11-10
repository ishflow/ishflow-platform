import APIClient
import AppShared
import Foundation
@testable import Sales
import XCTest

/// In-process stub. Returns the same `ProductPricesResponse` for every call
/// so a single test can assert which entry the resolver picks.
private actor StubPricesAPI: APIClient {
    private let response: ProductPricesResponse

    init(items: [ProductPriceItem]) {
        response = ProductPricesResponse(items: items)
    }

    func send<R: APIRequest>(_: R) async throws -> R.Response {
        let data = try JSONEncoder().encode(response)
        return try JSONDecoder().decode(R.Response.self, from: data)
    }
}

@MainActor
final class SalesWizardModelTests: XCTestCase {
    func testCanAdvanceFromCustomer_falseWithoutCustomer() {
        let model = SalesWizardModel()
        XCTAssertFalse(model.canAdvance(from: .customer))
    }

    func testCanAdvanceFromCustomer_trueWithCustomer() throws {
        let model = SalesWizardModel()
        model.customer = try makeCustomer()
        XCTAssertTrue(model.canAdvance(from: .customer))
    }

    func testCanAdvanceFromLines_falseWithEmpty() {
        let model = SalesWizardModel()
        XCTAssertFalse(model.canAdvance(from: .lines))
    }

    func testRestoringSeedsCustomerAndLines() {
        let customer = CatalogRef(id: UUID(), name: "Acme")
        let line = DocumentLine(
            id: UUID(),
            productId: UUID(),
            product: CatalogRef(id: UUID(), name: "Bread"),
            quantity: DecimalString("3"),
            unitPrice: DecimalString("15"),
            rowTotal: DecimalString("45")
        )
        let doc = DocumentRecord(
            id: UUID(), number: "INV-X", date: Date(), status: DocumentStatus.saved,
            createdAt: Date(), updatedAt: Date(),
            customerId: customer.id, customer: customer,
            lines: [line]
        )
        let model = SalesWizardModel(restoring: doc)
        XCTAssertNotNil(model.customer)
        XCTAssertEqual(model.lines.count, 1)
        XCTAssertEqual(model.lines.first?.unitPrice, 15)
    }

    func testAddRemoveLine() throws {
        let model = SalesWizardModel()
        let product = try makeProduct()
        model.addLine(product: product, quantity: 2, unitPrice: 10)
        XCTAssertEqual(model.lines.count, 1)
        XCTAssertEqual(model.lines[0].total, Decimal(20))

        if let line = model.lines.first {
            model.removeLine(line)
        }
        XCTAssertTrue(model.lines.isEmpty)
    }

    func testAddLineWithExplicitUnitPrice() throws {
        let model = SalesWizardModel()
        let product = try makeProduct()
        try model.addLine(product: product, quantity: 1, unitPrice: XCTUnwrap(Decimal(string: "25.5")))
        XCTAssertEqual(model.lines.count, 1)
        XCTAssertEqual(model.lines[0].unitPrice, Decimal(string: "25.5"))
    }

    func testLineTotalUpdatesWhenQuantityChanges() throws {
        let model = SalesWizardModel()
        let product = try makeProduct()
        model.addLine(product: product, quantity: 3, unitPrice: 10)
        XCTAssertEqual(model.lines[0].total, Decimal(30))

        model.lines[0].quantity = 5
        XCTAssertEqual(model.lines[0].total, Decimal(50))
    }

    func testHeaderFields() throws {
        let model = SalesWizardModel()
        model.warehouse = try decodeCatalogRecord(code: "WH1", name: "Main Warehouse")
        model.priceType = try decodeCatalogRecord(code: "PT1", name: "Retail")
        model.comment = "Test comment"

        XCTAssertEqual(model.warehouse?.name, "Main Warehouse")
        XCTAssertEqual(model.priceType?.name, "Retail")
        XCTAssertEqual(model.comment, "Test comment")
    }

    func testAddLineResolvesUnitPriceFromActivePriceType() async throws {
        let stub = StubPricesAPI(items: [
            ProductPriceItem(
                priceTypeId: "pt-retail",
                priceTypeName: "Retail",
                kind: "static",
                isDefault: true,
                value: DecimalString(Decimal(string: "199.99")!)
            )
        ])
        let model = SalesWizardModel()
        let product = try makeProduct()
        let resolver = PriceResolver(api: stub)

        await model.addLineResolvingPrice(
            product: product,
            priceTypeId: "pt-retail",
            resolver: resolver
        )

        XCTAssertEqual(model.lines.count, 1)
        XCTAssertEqual(model.lines.first?.unitPrice, Decimal(string: "199.99"))
    }

    func testAddLineFallsBackToSalePriceWhenResolverReturnsNoMatch() async throws {
        let stub = StubPricesAPI(items: [])
        let model = SalesWizardModel()
        let product = try decodeCatalogRecord(
            code: "P-fallback",
            name: "Salt",
            salePrice: DecimalString(Decimal(string: "9.50")!)
        )
        let resolver = PriceResolver(api: stub)

        await model.addLineResolvingPrice(
            product: product,
            priceTypeId: "pt-retail",
            resolver: resolver
        )

        XCTAssertEqual(model.lines.first?.unitPrice, Decimal(string: "9.50"))
    }

    func testReapplyPriceTypeUpdatesExistingLines() async throws {
        let stub = StubPricesAPI(items: [
            ProductPriceItem(
                priceTypeId: "pt-wholesale",
                priceTypeName: "Wholesale",
                kind: "static",
                isDefault: false,
                value: DecimalString(Decimal(string: "75.00")!)
            )
        ])
        let model = SalesWizardModel()
        let product = try makeProduct()
        model.addLine(product: product, quantity: 2, unitPrice: 100)
        let resolver = PriceResolver(api: stub)

        await model.reapplyPriceType(priceTypeId: "pt-wholesale", resolver: resolver)

        XCTAssertEqual(model.lines.first?.unitPrice, Decimal(string: "75.00"))
    }

    func testTotalAmountFromMultipleLines() throws {
        let model = SalesWizardModel()
        let product1 = try makeProduct()
        model.addLine(product: product1, quantity: 2, unitPrice: 10)
        let product2 = try makeProduct()
        model.addLine(product: product2, quantity: 3, unitPrice: 5)

        let total = model.lines.reduce(Decimal.zero) { $0 + $1.total }
        XCTAssertEqual(total, Decimal(35))
    }

    private func makeCustomer() throws -> CatalogRecord {
        try decodeCatalogRecord(code: "C1", name: "Test customer")
    }

    private func makeProduct() throws -> CatalogRecord {
        try decodeCatalogRecord(code: "P1", name: "Test product")
    }

    private func decodeCatalogRecord(
        code: String, name: String, salePrice: DecimalString? = nil
    ) throws -> CatalogRecord {
        var jsonDict: [String: Any] = [
            "id": UUID().uuidString,
            "code": code,
            "name": name,
            "createdAt": "2026-04-26T10:00:00Z",
            "updatedAt": "2026-04-26T10:00:00Z"
        ]
        if let salePrice {
            jsonDict["salePrice"] = salePrice.value.description
        }
        let data = try JSONSerialization.data(withJSONObject: jsonDict)
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(CatalogRecord.self, from: data)
    }
}
