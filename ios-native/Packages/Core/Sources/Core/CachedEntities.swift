import Foundation
import SwiftData

@Model
public final class CachedCustomer {
    @Attribute(.unique) public var id: String
    public var code: String
    public var name: String
    public var phone: String?
    public var email: String?
    public var defaultPriceTypeId: String?
    public var updatedAt: Date

    public init(id: String, code: String, name: String, phone: String? = nil, email: String? = nil, defaultPriceTypeId: String? = nil, updatedAt: Date) {
        self.id = id
        self.code = code
        self.name = name
        self.phone = phone
        self.email = email
        self.defaultPriceTypeId = defaultPriceTypeId
        self.updatedAt = updatedAt
    }
}

@Model
public final class CachedProduct {
    @Attribute(.unique) public var id: String
    public var code: String
    public var name: String
    public var categoryId: String?
    public var updatedAt: Date

    public init(id: String, code: String, name: String, categoryId: String? = nil, updatedAt: Date) {
        self.id = id
        self.code = code
        self.name = name
        self.categoryId = categoryId
        self.updatedAt = updatedAt
    }
}

@Model
public final class CachedWarehouse {
    @Attribute(.unique) public var id: String
    public var code: String
    public var name: String
    public var updatedAt: Date

    public init(id: String, code: String, name: String, updatedAt: Date) {
        self.id = id
        self.code = code
        self.name = name
        self.updatedAt = updatedAt
    }
}

@Model
public final class CachedPriceType {
    @Attribute(.unique) public var id: String
    public var name: String
    public var kind: String
    public var updatedAt: Date

    public init(id: String, name: String, kind: String, updatedAt: Date) {
        self.id = id
        self.name = name
        self.kind = kind
        self.updatedAt = updatedAt
    }
}
