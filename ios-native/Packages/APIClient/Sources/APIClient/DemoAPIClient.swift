// swiftlint:disable line_length identifier_name
import AppShared
import Foundation

/// In-memory API client that returns demo data without hitting the network.
/// Used for "Preview without sign-in" mode. Driven by an explicit (method, pattern) → JSON
/// route table; supports `<uuid>` placeholders.
public actor DemoAPIClient: APIClient {
    public init() {}

    public func send<R: APIRequest>(_ request: R) async throws -> R.Response {
        let json = try resolve(method: request.method, path: request.path)
        guard let data = json.data(using: .utf8) else {
            throw APIError.decoding("Invalid UTF-8")
        }
        do {
            return try JSONDecoder.ishflow.decode(R.Response.self, from: data)
        } catch {
            throw APIError.decoding(String(describing: error))
        }
    }

    private func resolve(method: HTTPMethod, path: String) throws -> String {
        for route in Self.routes where route.matches(method: method, path: path) {
            return route.json()
        }
        throw APIError.http(status: 404, body: nil)
    }

    private struct Route {
        let method: HTTPMethod
        let pattern: String
        let json: @Sendable () -> String

        func matches(method m: HTTPMethod, path p: String) -> Bool {
            guard m == method else { return false }
            // <uuid> placeholder → 8-4-4-4-12 hex segment
            let regex = pattern.replacingOccurrences(
                of: "<uuid>",
                with: #"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"#
            )
            return p.range(of: "^\(regex)$", options: .regularExpression) != nil
        }
    }

    private static let routes: [Route] = [
        Route(method: .get, pattern: "/api/mobile/me", json: meJSON),

        Route(method: .get, pattern: "/api/mobile/documents/sales.invoice", json: documentListJSON),
        Route(method: .get, pattern: "/api/mobile/documents/sales.invoice/<uuid>", json: documentDetailJSON),
        Route(method: .post, pattern: "/api/mobile/documents/sales.invoice", json: documentCreateJSON),
        Route(method: .post, pattern: "/api/mobile/documents/sales.invoice/<uuid>/post", json: documentPostJSON),

        Route(method: .get, pattern: "/api/mobile/catalogs/sales.customer", json: customerListJSON),
        Route(method: .get, pattern: "/api/mobile/catalogs/sales.customer/<uuid>", json: customerDetailJSON),
        Route(method: .get, pattern: "/api/mobile/catalogs/inventory.product", json: productListJSON),
        Route(method: .get, pattern: "/api/mobile/catalogs/inventory.product/<uuid>", json: productDetailJSON),
        Route(method: .get, pattern: "/api/mobile/catalogs/inventory.warehouse", json: warehouseListJSON),
        Route(method: .get, pattern: "/api/mobile/catalogs/sales.priceType", json: priceTypeListJSON),
        Route(method: .get, pattern: "/api/mobile/catalogs/sales.priceType/<uuid>", json: priceTypeDetailJSON),
        Route(method: .get, pattern: "/api/mobile/catalogs/sales.priceAgreement", json: priceAgreementListJSON),

        Route(method: .get, pattern: "/api/mobile/registers/sales.accounts_receivable/balance", json: arBalanceJSON),
        Route(method: .get, pattern: "/api/mobile/registers/purchases.accounts_payable/balance", json: apBalanceJSON),
        Route(method: .get, pattern: "/api/mobile/registers/inventory.stock_balance/balance", json: stockBalanceJSON),

        Route(method: .get, pattern: "/api/mobile/counterparties", json: counterpartiesJSON),

        Route(method: .get, pattern: "/api/mobile/notifications", json: notificationListJSON),
        Route(method: .get, pattern: "/api/mobile/tenants", json: tenantListJSON),

        Route(method: .post, pattern: "/api/mobile/push/register", json: emptyJSON)
    ]

    /// ===== JSON payloads =====
    private static func meJSON() -> String {
        #"""
        {
          "user":{"id":"00000000-0000-0000-0000-000000000001","email":"demo@ishflow.com","firstName":"Demo","lastName":"User","imageUrl":null},
          "tenant":{"id":"00000000-0000-0000-0000-000000000002","slug":"demo","name":"Demo Company","currency":"USD","mobileFeatures":{"sales":true,"prices":true,"inventory":true,"purchases":false,"payments":false}},
          "permissions":["sales.read","sales.write","inventory.read","prices.read"]
        }
        """#
    }

    private static func documentListJSON() -> String {
        #"""
        {"items":[
          {"id":"00000000-0000-0000-0000-000000000010","number":"INV-001","date":"2026-04-26T00:00:00Z","status":"POSTED",
           "createdAt":"2026-04-26T10:00:00Z","updatedAt":"2026-04-26T10:00:00Z",
           "customer":{"id":"00000000-0000-0000-0000-000000000020","code":"CUST001","name":"Acme Corporation"},
           "total":"1234.50"},
          {"id":"00000000-0000-0000-0000-000000000011","number":"INV-002","date":"2026-04-25T00:00:00Z","status":"DRAFT",
           "createdAt":"2026-04-25T10:00:00Z","updatedAt":"2026-04-25T10:00:00Z",
           "customer":{"id":"00000000-0000-0000-0000-000000000021","code":"CUST002","name":"Globex Industries"},
           "total":"500.00"}
        ],"total":2,"page":1,"pageSize":20}
        """#
    }

    private static func documentDetailJSON() -> String {
        #"""
        {"id":"00000000-0000-0000-0000-000000000010","number":"INV-001","date":"2026-04-26T00:00:00Z","status":"POSTED",
         "createdAt":"2026-04-26T10:00:00Z","updatedAt":"2026-04-26T10:00:00Z",
         "customerId":"00000000-0000-0000-0000-000000000020",
         "customer":{"id":"00000000-0000-0000-0000-000000000020","code":"CUST001","name":"Acme Corporation"},
         "warehouseId":"00000000-0000-0000-0000-000000000040",
         "warehouse":{"id":"00000000-0000-0000-0000-000000000040","code":"WH001","name":"Main Warehouse"},
         "comment":"Demo invoice","total":"1234.50",
         "lines":[
           {"id":"00000000-0000-0000-0000-000000000060","productId":"00000000-0000-0000-0000-000000000050",
            "product":{"id":"00000000-0000-0000-0000-000000000050","code":"BRD1","name":"Bread"},
            "quantity":"30","unitPrice":"15.0","rowTotal":"450.0"},
           {"id":"00000000-0000-0000-0000-000000000061","productId":"00000000-0000-0000-0000-000000000051",
            "product":{"id":"00000000-0000-0000-0000-000000000051","code":"WGT","name":"Widget"},
            "quantity":"7","unitPrice":"112.07","rowTotal":"784.50"}
         ]}
        """#
    }

    private static func documentCreateJSON() -> String {
        #"""
        {"id":"00000000-0000-0000-0000-000000000099","record":
          {"id":"00000000-0000-0000-0000-000000000099","number":"INV-DEMO","date":"2026-04-27T00:00:00Z","status":"SAVED",
           "createdAt":"2026-04-27T00:00:00Z","updatedAt":"2026-04-27T00:00:00Z","total":"0"}}
        """#
    }

    private static func documentPostJSON() -> String {
        #"{"movementCount":3}"#
    }

    private static func customerListJSON() -> String {
        #"""
        {"items":[
          {"id":"00000000-0000-0000-0000-000000000020","code":"CUST001","name":"Acme Corporation","createdAt":"2026-01-01T00:00:00Z","updatedAt":"2026-01-01T00:00:00Z","phone":"+1 555 0100","email":"orders@acme.test"},
          {"id":"00000000-0000-0000-0000-000000000021","code":"CUST002","name":"Globex Industries","createdAt":"2026-01-01T00:00:00Z","updatedAt":"2026-01-01T00:00:00Z"}
        ],"total":2,"page":1,"pageSize":20}
        """#
    }

    private static func customerDetailJSON() -> String {
        #"""
        {"id":"00000000-0000-0000-0000-000000000020","code":"CUST001","name":"Acme Corporation","createdAt":"2026-01-01T00:00:00Z","updatedAt":"2026-01-01T00:00:00Z","phone":"+1 555 0100","email":"orders@acme.test"}
        """#
    }

    private static func productListJSON() -> String {
        #"""
        {"items":[
          {"id":"00000000-0000-0000-0000-000000000050","code":"BRD1","name":"Bread","createdAt":"2026-01-01T00:00:00Z","updatedAt":"2026-01-01T00:00:00Z","unit":"pcs","costPrice":"10.0","salePrice":"15.0","barcode":"4006381333931"},
          {"id":"00000000-0000-0000-0000-000000000051","code":"WGT","name":"Widget","createdAt":"2026-01-01T00:00:00Z","updatedAt":"2026-01-01T00:00:00Z","unit":"pcs","costPrice":"80.0","salePrice":"112.07","barcode":"4006381333948"}
        ],"total":2,"page":1,"pageSize":20}
        """#
    }

    private static func productDetailJSON() -> String {
        #"""
        {"id":"00000000-0000-0000-0000-000000000050","code":"BRD1","name":"Bread","createdAt":"2026-01-01T00:00:00Z","updatedAt":"2026-01-01T00:00:00Z","unit":"pcs","costPrice":"10.0","salePrice":"15.0","barcode":"4006381333931"}
        """#
    }

    private static func warehouseListJSON() -> String {
        #"""
        {"items":[
          {"id":"00000000-0000-0000-0000-000000000040","code":"WH001","name":"Main Warehouse","createdAt":"2026-01-01T00:00:00Z","updatedAt":"2026-01-01T00:00:00Z"}
        ],"total":1,"page":1,"pageSize":20}
        """#
    }

    private static func priceTypeListJSON() -> String {
        #"""
        {"items":[
          {"id":"00000000-0000-0000-0000-000000000070","code":"RETAIL","name":"Retail","createdAt":"2026-01-01T00:00:00Z","updatedAt":"2026-01-01T00:00:00Z"},
          {"id":"00000000-0000-0000-0000-000000000071","code":"WHOLESALE","name":"Wholesale","createdAt":"2026-01-01T00:00:00Z","updatedAt":"2026-01-01T00:00:00Z"}
        ],"total":2,"page":1,"pageSize":20}
        """#
    }

    private static func priceTypeDetailJSON() -> String {
        #"""
        {"id":"00000000-0000-0000-0000-000000000070","code":"RETAIL","name":"Retail","createdAt":"2026-01-01T00:00:00Z","updatedAt":"2026-01-01T00:00:00Z"}
        """#
    }

    private static func priceAgreementListJSON() -> String {
        #"""
        {"items":[
          {"id":"00000000-0000-0000-0000-000000000080","code":null,"name":"Bread @ Retail = 15.0","createdAt":"2026-01-01T00:00:00Z","updatedAt":"2026-01-01T00:00:00Z"},
          {"id":"00000000-0000-0000-0000-000000000081","code":null,"name":"Widget @ Retail = 112.07","createdAt":"2026-01-01T00:00:00Z","updatedAt":"2026-01-01T00:00:00Z"}
        ],"total":2,"page":1,"pageSize":20}
        """#
    }

    private static func arBalanceJSON() -> String {
        #"""
        {"register":"sales.accounts_receivable","asOf":"2026-04-26T00:00:00Z","rows":[
          {"groupKey":{"customerId":"00000000-0000-0000-0000-000000000020"},
           "groupLabels":{"customerId":"Acme Corporation"},
           "revenue":"1234.50"}]}
        """#
    }

    private static func apBalanceJSON() -> String {
        #"""
        {"register":"purchases.accounts_payable","asOf":"2026-04-26T00:00:00Z","rows":[
          {"groupKey":{"supplierId":"00000000-0000-0000-0000-000000000022"},
           "groupLabels":{"supplierId":"Initech Supplies"},
           "revenue":"5000.00"}]}
        """#
    }

    private static func stockBalanceJSON() -> String {
        #"""
        {"register":"inventory.stock_balance","asOf":"2026-04-26T00:00:00Z","rows":[
          {"groupKey":{"productId":"00000000-0000-0000-0000-000000000050","warehouseId":"00000000-0000-0000-0000-000000000040"},
           "groupLabels":{"productId":"Bread","warehouseId":"Main Warehouse"},
           "quantity":"150.5","cost":"1505.00"},
          {"groupKey":{"productId":"00000000-0000-0000-0000-000000000051","warehouseId":"00000000-0000-0000-0000-000000000040"},
           "groupLabels":{"productId":"Widget","warehouseId":"Main Warehouse"},
           "quantity":"42","cost":"3360.00"}]}
        """#
    }

    private static func counterpartiesJSON() -> String {
        #"""
        {"items":[
          {"id":"00000000-0000-0000-0000-000000000020","code":"CUST001","name":"Acme Corporation","balance":"1234.50","balanceDirection":"owesUs","currency":"USD"},
          {"id":"00000000-0000-0000-0000-000000000021","code":"CUST002","name":"Globex Industries","balance":"500.00","balanceDirection":"owesUs","currency":"USD"},
          {"id":"00000000-0000-0000-0000-000000000022","code":"CUST003","name":"Initech","balance":"0","balanceDirection":"zero","currency":"USD"},
          {"id":"00000000-0000-0000-0000-000000000023","code":"CUST004","name":"Umbrella Corp","balance":"2750.00","balanceDirection":"weOwe","currency":"USD"}
        ],"total":4,"page":1,"pageSize":50}
        """#
    }

    private static func notificationListJSON() -> String {
        #"""
        {"items":[
          {"id":"00000000-0000-0000-0000-000000000090","title":"Invoice Posted","message":"INV-001 has been posted.","date":"2026-04-26T09:00:00Z","isRead":false,"deepLink":"ishflow://documents/sales.invoice/00000000-0000-0000-0000-000000000010"},
          {"id":"00000000-0000-0000-0000-000000000091","title":"Low stock","message":"Bread is below threshold.","date":"2026-04-25T07:00:00Z","isRead":true,"deepLink":null}
        ],"total":2,"page":1,"pageSize":20}
        """#
    }

    private static func tenantListJSON() -> String {
        #"""
        {"items":[
          {"id":"00000000-0000-0000-0000-000000000002","slug":"demo","name":"Demo Company","currency":"USD","mobileFeatures":{"sales":true,"prices":true,"inventory":true,"purchases":false,"payments":false}}
        ]}
        """#
    }

    private static func emptyJSON() -> String {
        "{}"
    }
}
