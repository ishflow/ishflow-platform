import APIClient
import Foundation

/// `POST /api/mobile/onboarding/tenant` — creates a tenant for the signed-in
/// user and returns a fresh JWT scoped to it.
public struct CreateTenantRequest: APIRequest {
    public typealias Response = CreateTenantResponse

    public let name: String
    public let currency: String
    public let locale: String
    public let brandColor: String?

    public init(name: String, currency: String, locale: String, brandColor: String? = nil) {
        self.name = name
        self.currency = currency
        self.locale = locale
        self.brandColor = brandColor
    }

    public var path: String { "/api/mobile/onboarding/tenant" }
    public var method: HTTPMethod { .post }
    public var body: (any Encodable & Sendable)? {
        Body(name: name, currency: currency, locale: locale, brandColor: brandColor)
    }

    private struct Body: Encodable, Sendable {
        let name: String
        let currency: String
        let locale: String
        let brandColor: String?
    }
}

public struct CreateTenantResponse: Codable, Sendable, Equatable {
    public let tenantId: String
    public let jwt: String
    public let trialEndsAt: String

    public init(tenantId: String, jwt: String, trialEndsAt: String) {
        self.tenantId = tenantId
        self.jwt = jwt
        self.trialEndsAt = trialEndsAt
    }
}

/// `POST /api/mobile/onboarding/seed-demo` — imports the demo dataset into
/// the tenant the caller just created.
public struct SeedDemoRequest: APIRequest {
    public typealias Response = SeedDemoResponse

    public let tenantId: String

    public init(tenantId: String) {
        self.tenantId = tenantId
    }

    public var path: String { "/api/mobile/onboarding/seed-demo" }
    public var method: HTTPMethod { .post }
    public var body: (any Encodable & Sendable)? { Body(tenantId: tenantId) }

    private struct Body: Encodable, Sendable {
        let tenantId: String
    }
}

public struct SeedDemoResponse: Codable, Sendable, Equatable {
    public let ok: Bool
    public let summary: Summary

    public init(ok: Bool, summary: Summary) {
        self.ok = ok
        self.summary = summary
    }

    public struct Summary: Codable, Sendable, Equatable {
        public let customers: Int
        public let products: Int
        public let documents: Int

        public init(customers: Int, products: Int, documents: Int) {
            self.customers = customers
            self.products = products
            self.documents = documents
        }
    }
}

/// `DELETE /api/mobile/me/account` — permanently deletes the caller's account.
public struct DeleteAccountRequest: APIRequest {
    public typealias Response = DeleteAccountResponse

    public init() {}

    public var path: String { "/api/mobile/me/account" }
    public var method: HTTPMethod { .delete }
}

public struct DeleteAccountResponse: Codable, Sendable, Equatable {
    public let deletedAt: String

    public init(deletedAt: String) {
        self.deletedAt = deletedAt
    }
}

/// Body shape the server returns with HTTP 409 when delete-account refuses
/// because the user is the sole owner of one or more tenants.
struct DeleteAccountConflictBody: Decodable {
    let error: String
    let tenantIds: [String]
}
