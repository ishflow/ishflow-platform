@testable import AppShared
import XCTest

final class DocumentRecordExpansionTests: XCTestCase {
    private let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()

    func testDocumentRecordDecodesFullPayloadWithLinesAndCustomer() throws {
        let json = Data(Self.fullPayloadJSON.utf8)
        let record = try decoder.decode(DocumentRecord.self, from: json)
        XCTAssertEqual(record.number, "INV-100")
        XCTAssertEqual(record.status, .posted)
        XCTAssertEqual(record.customer?.name, "Acme")
        XCTAssertEqual(record.customer?.code, "CUST-1")
        XCTAssertEqual(record.warehouse?.name, "Main warehouse")
        XCTAssertNil(record.warehouse?.code)
        XCTAssertEqual(record.priceType?.code, "RETAIL")
        XCTAssertEqual(record.comment, "VIP order")
        XCTAssertEqual(record.total?.value, Decimal(string: "1234.56"))
        XCTAssertEqual(record.lines?.count, 2)
        XCTAssertEqual(record.lines?.first?.product?.name, "Widget")
        XCTAssertEqual(record.lines?.first?.quantity.value, Decimal(string: "2"))
        XCTAssertEqual(record.lines?.first?.unitPrice.value, Decimal(string: "100.00"))
        XCTAssertEqual(record.lines?.first?.rowTotal.value, Decimal(string: "200.00"))
        XCTAssertNil(record.lines?.last?.product)
    }

    func testDocumentRecordDecodesRawFkStringPayload() throws {
        // Captures the current GET /api/mobile/documents/[type] shape, where
        // ref columns ship as raw FK UUID strings under `customer`/`warehouse`
        // rather than embedded objects. The Codable must tolerate this and
        // surface the UUID via `*Id` while leaving the embedded ref nil.
        let json = Data(Self.rawFkPayloadJSON.utf8)
        let record = try decoder.decode(DocumentRecord.self, from: json)
        XCTAssertEqual(record.number, "INVOICE-000001")
        XCTAssertEqual(record.status, .posted)
        XCTAssertEqual(
            record.customerId,
            UUID(uuidString: "f97e29f7-46b3-42af-afdc-7778665db887")
        )
        XCTAssertNil(record.customer)
        XCTAssertEqual(
            record.warehouseId,
            UUID(uuidString: "ab683302-f25e-4b03-801e-722211ce68b1")
        )
        XCTAssertNil(record.warehouse)
        XCTAssertNil(record.priceTypeId)
        XCTAssertNil(record.priceType)
    }

    func testDocumentRecordDecodesFlatLinesArrayPayload() throws {
        // Captures the GET /api/mobile/documents/[type]/[id] shape after the
        // mobile route flattens the engine's section-keyed lines dict
        // (`{ items: [...] }`) into a flat array. iOS expects a flat array.
        let json = Data(Self.flatLinesArrayPayloadJSON.utf8)
        let record = try decoder.decode(DocumentRecord.self, from: json)
        XCTAssertEqual(record.number, "INVOICE-000001")
        XCTAssertEqual(record.status, .posted)
        XCTAssertEqual(record.lines?.count, 2)
        XCTAssertEqual(record.lines?.first?.quantity.value, Decimal(string: "5"))
        XCTAssertEqual(record.lines?.first?.unitPrice.value, Decimal(string: "550"))
        XCTAssertEqual(record.lines?.last?.rowTotal.value, Decimal(string: "2750"))
    }

    func testDocumentRecordDecodesPurchaseInvoiceWithSupplier() throws {
        // The mobile route enricher emits `supplier` (and `supplierId`) on
        // purchase-invoice list rows. iOS must decode both into UUID + ref so
        // the Cari supplier path can filter docs client-side by supplierId.
        let json = Data(Self.supplierPayloadJSON.utf8)
        let record = try decoder.decode(DocumentRecord.self, from: json)
        XCTAssertEqual(record.number, "PURCH-000001")
        XCTAssertEqual(record.status, .posted)
        XCTAssertEqual(
            record.supplierId,
            UUID(uuidString: "11111111-2222-3333-4444-555555555555")
        )
        XCTAssertEqual(record.supplier?.id, UUID(uuidString: "11111111-2222-3333-4444-555555555555"))
        XCTAssertEqual(record.supplier?.name, "Globex Distribution")
        XCTAssertEqual(record.supplier?.code, "SUPP-1")
        // Customer side stays empty on a supplier-side document.
        XCTAssertNil(record.customerId)
        XCTAssertNil(record.customer)
    }

    func testDocumentRecordDecodesMinimalPayload() throws {
        let json = Data(Self.minimalPayloadJSON.utf8)
        let record = try decoder.decode(DocumentRecord.self, from: json)
        XCTAssertEqual(record.number, "INV-101")
        XCTAssertEqual(record.status, .draft)
        XCTAssertNil(record.customerId)
        XCTAssertNil(record.customer)
        XCTAssertNil(record.warehouseId)
        XCTAssertNil(record.warehouse)
        XCTAssertNil(record.priceTypeId)
        XCTAssertNil(record.priceType)
        XCTAssertNil(record.comment)
        XCTAssertNil(record.total)
        XCTAssertNil(record.lines)
    }

    private static let fullPayloadJSON: String = #"""
    {
        "id": "00000000-0000-0000-0000-000000000100",
        "number": "INV-100",
        "date": "2026-04-26T00:00:00Z",
        "status": "POSTED",
        "createdAt": "2026-04-26T10:00:00Z",
        "updatedAt": "2026-04-26T10:30:00Z",
        "customerId": "00000000-0000-0000-0000-000000000200",
        "customer": {
            "id": "00000000-0000-0000-0000-000000000200",
            "code": "CUST-1",
            "name": "Acme"
        },
        "warehouseId": "00000000-0000-0000-0000-000000000300",
        "warehouse": {
            "id": "00000000-0000-0000-0000-000000000300",
            "name": "Main warehouse"
        },
        "priceTypeId": "00000000-0000-0000-0000-000000000400",
        "priceType": {
            "id": "00000000-0000-0000-0000-000000000400",
            "code": "RETAIL",
            "name": "Retail"
        },
        "comment": "VIP order",
        "total": "1234.56",
        "lines": [
            {
                "id": "00000000-0000-0000-0000-000000000500",
                "productId": "00000000-0000-0000-0000-000000000600",
                "product": {
                    "id": "00000000-0000-0000-0000-000000000600",
                    "code": "P-1",
                    "name": "Widget"
                },
                "quantity": "2",
                "unitPrice": "100.00",
                "rowTotal": "200.00"
            },
            {
                "id": "00000000-0000-0000-0000-000000000501",
                "productId": "00000000-0000-0000-0000-000000000601",
                "quantity": "10.345",
                "unitPrice": "100.41",
                "rowTotal": "1034.56"
            }
        ]
    }
    """#

    /// Real prod response captured 2026-04-27 from
    /// `GET /api/mobile/documents/sales.invoice?pageSize=5`.
    /// Refs ship as raw FK UUID strings rather than embedded objects.
    private static let rawFkPayloadJSON: String = #"""
    {
        "id": "2b9959a9-8aca-4575-8fda-9159fd382f0b",
        "number": "INVOICE-000001",
        "date": "2026-04-25T06:31:15.505Z",
        "status": "POSTED",
        "createdAt": "2026-04-25T06:31:51.090Z",
        "updatedAt": "2026-04-25T06:31:51.197Z",
        "customer": "f97e29f7-46b3-42af-afdc-7778665db887",
        "warehouse": "ab683302-f25e-4b03-801e-722211ce68b1",
        "priceType": null
    }
    """#

    /// Real prod response shape captured 2026-04-27 from
    /// `GET /api/mobile/documents/sales.invoice/<id>` after the mobile route
    /// flattens the engine's section-keyed `lines` dict to a flat array.
    private static let flatLinesArrayPayloadJSON: String = #"""
    {
        "id": "2b9959a9-8aca-4575-8fda-9159fd382f0b",
        "number": "INVOICE-000001",
        "date": "2026-04-25T06:31:15.505Z",
        "status": "POSTED",
        "createdAt": "2026-04-25T06:31:51.090Z",
        "updatedAt": "2026-04-25T06:31:51.197Z",
        "customerId": "f97e29f7-46b3-42af-afdc-7778665db887",
        "warehouseId": "ab683302-f25e-4b03-801e-722211ce68b1",
        "lines": [
            {
                "id": "00000000-0000-0000-0000-000000000700",
                "productId": "00000000-0000-0000-0000-000000000800",
                "quantity": "5",
                "unitPrice": "550",
                "rowTotal": "2750"
            },
            {
                "id": "00000000-0000-0000-0000-000000000701",
                "productId": "00000000-0000-0000-0000-000000000801",
                "quantity": "10",
                "unitPrice": "275",
                "rowTotal": "2750"
            }
        ]
    }
    """#

    /// Real-shape purchase-invoice list row after `enrichDocumentListRows`
    /// replaces the raw FK string under `supplier` with an embedded ref and
    /// adds `supplierId` alongside (mirrors the customer-side enrichment).
    private static let supplierPayloadJSON: String = #"""
    {
        "id": "00000000-0000-0000-0000-000000000999",
        "number": "PURCH-000001",
        "date": "2026-04-26T00:00:00Z",
        "status": "POSTED",
        "createdAt": "2026-04-26T10:00:00Z",
        "updatedAt": "2026-04-26T10:30:00Z",
        "supplierId": "11111111-2222-3333-4444-555555555555",
        "supplier": {
            "id": "11111111-2222-3333-4444-555555555555",
            "code": "SUPP-1",
            "name": "Globex Distribution"
        }
    }
    """#

    private static let minimalPayloadJSON: String = #"""
    {
        "id": "00000000-0000-0000-0000-000000000101",
        "number": "INV-101",
        "date": "2026-04-26T00:00:00Z",
        "status": "DRAFT",
        "createdAt": "2026-04-26T10:00:00Z",
        "updatedAt": "2026-04-26T10:00:00Z"
    }
    """#
}
