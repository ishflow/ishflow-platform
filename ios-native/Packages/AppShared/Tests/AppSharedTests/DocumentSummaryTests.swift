@testable import AppShared
import XCTest

final class DocumentSummaryTests: XCTestCase {
    func testDocumentKindRawValuesMatchBackendSlugs() {
        XCTAssertEqual(DocumentKind.salesInvoice.rawValue, "sales.invoice")
        XCTAssertEqual(DocumentKind.salesPaymentReceived.rawValue, "sales.payment_received")
        XCTAssertEqual(DocumentKind.purchaseInvoice.rawValue, "purchases.invoice")
        XCTAssertEqual(DocumentKind.purchasePaymentSent.rawValue, "purchases.payment_sent")
    }

    func testFromRecordMapsSalesInvoiceWithEmbeddedCustomer() {
        let docId = UUID(uuidString: "00000000-0000-0000-0000-000000000010")!
        let customerId = UUID(uuidString: "00000000-0000-0000-0000-000000000020")!
        let date = Date(timeIntervalSince1970: 1_714_435_200)
        let createdAt = Date(timeIntervalSince1970: 1_714_435_300)
        let updatedAt = Date(timeIntervalSince1970: 1_714_435_400)
        let record = DocumentRecord(
            id: docId,
            number: "INV-100",
            date: date,
            status: .posted,
            createdAt: createdAt,
            updatedAt: updatedAt,
            customerId: customerId,
            customer: CatalogRef(id: customerId, code: "CUST-1", name: "Acme"),
            total: DecimalString(Decimal(string: "1234.56")!)
        )

        let summary = DocumentSummary.from(
            record: record,
            kind: .salesInvoice,
            tenantCurrency: "USD"
        )

        XCTAssertEqual(summary.id, docId)
        XCTAssertEqual(summary.kind, .salesInvoice)
        XCTAssertEqual(summary.displayNumber, "INV-100")
        XCTAssertEqual(summary.date, date)
        XCTAssertEqual(summary.counterpartyName, "Acme")
        XCTAssertEqual(summary.amount?.value, Decimal(string: "1234.56"))
        XCTAssertEqual(summary.currency, "USD")
        XCTAssertEqual(summary.status, .posted)
    }

    func testFromRecordMapsPurchaseInvoiceWithEmbeddedSupplier() {
        let docId = UUID(uuidString: "00000000-0000-0000-0000-000000000030")!
        let supplierId = UUID(uuidString: "00000000-0000-0000-0000-000000000040")!
        let date = Date(timeIntervalSince1970: 1_714_435_500)
        let record = DocumentRecord(
            id: docId,
            number: "PURCH-001",
            date: date,
            status: .saved,
            createdAt: date,
            updatedAt: date,
            supplierId: supplierId,
            supplier: CatalogRef(id: supplierId, code: "SUPP-1", name: "Globex Distribution"),
            total: DecimalString(Decimal(string: "999.00")!)
        )

        let summary = DocumentSummary.from(
            record: record,
            kind: .purchaseInvoice,
            tenantCurrency: "EUR"
        )

        XCTAssertEqual(summary.kind, .purchaseInvoice)
        XCTAssertEqual(summary.counterpartyName, "Globex Distribution")
        XCTAssertEqual(summary.displayNumber, "PURCH-001")
        XCTAssertEqual(summary.currency, "EUR")
        XCTAssertEqual(summary.status, .saved)
    }

    func testFromRecordWithoutCounterpartyHasNilName() {
        let docId = UUID(uuidString: "00000000-0000-0000-0000-000000000050")!
        let date = Date(timeIntervalSince1970: 1_714_435_600)
        let record = DocumentRecord(
            id: docId,
            number: "INV-NO-CP",
            date: date,
            status: .draft,
            createdAt: date,
            updatedAt: date
        )

        let summary = DocumentSummary.from(
            record: record,
            kind: .salesInvoice,
            tenantCurrency: "RUB"
        )

        XCTAssertNil(summary.counterpartyName)
        XCTAssertNil(summary.amount)
        XCTAssertEqual(summary.currency, "RUB")
        XCTAssertEqual(summary.status, .draft)
    }
}
