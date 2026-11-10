import Foundation
import SwiftData

@ModelActor
public actor ReadCacheRepository {
    public func upsertCustomers(_ items: [CustomerDTO]) async throws {
        for dto in items {
            let dtoId = dto.id
            let descriptor = FetchDescriptor<CachedCustomer>(
                predicate: #Predicate { $0.id == dtoId }
            )
            if let existing = try modelContext.fetch(descriptor).first {
                existing.code = dto.code
                existing.name = dto.name
                existing.phone = dto.phone
                existing.email = dto.email
                existing.defaultPriceTypeId = dto.defaultPriceTypeId
                existing.updatedAt = dto.updatedAt
            } else {
                modelContext.insert(CachedCustomer(
                    id: dto.id,
                    code: dto.code,
                    name: dto.name,
                    phone: dto.phone,
                    email: dto.email,
                    defaultPriceTypeId: dto.defaultPriceTypeId,
                    updatedAt: dto.updatedAt
                ))
            }
        }
        try modelContext.save()
    }

    public func customers() async -> ([CachedCustomer], Date?) {
        let descriptor = FetchDescriptor<CachedCustomer>(
            sortBy: [SortDescriptor(\.name)]
        )
        let items = (try? modelContext.fetch(descriptor)) ?? []
        let lastUpdated = items.map(\.updatedAt).max()
        return (items, lastUpdated)
    }

    public func upsertProducts(_ items: [ProductDTO]) async throws {
        for dto in items {
            let dtoId = dto.id
            let descriptor = FetchDescriptor<CachedProduct>(
                predicate: #Predicate { $0.id == dtoId }
            )
            if let existing = try modelContext.fetch(descriptor).first {
                existing.code = dto.code
                existing.name = dto.name
                existing.categoryId = dto.categoryId
                existing.updatedAt = dto.updatedAt
            } else {
                modelContext.insert(CachedProduct(
                    id: dto.id,
                    code: dto.code,
                    name: dto.name,
                    categoryId: dto.categoryId,
                    updatedAt: dto.updatedAt
                ))
            }
        }
        try modelContext.save()
    }

    public func products() async -> ([CachedProduct], Date?) {
        let descriptor = FetchDescriptor<CachedProduct>(
            sortBy: [SortDescriptor(\.name)]
        )
        let items = (try? modelContext.fetch(descriptor)) ?? []
        let lastUpdated = items.map(\.updatedAt).max()
        return (items, lastUpdated)
    }
}

public struct CustomerDTO: Sendable {
    public let id: String
    public let code: String
    public let name: String
    public let phone: String?
    public let email: String?
    public let defaultPriceTypeId: String?
    public let updatedAt: Date

    public init(id: String, code: String, name: String, phone: String?, email: String?, defaultPriceTypeId: String?, updatedAt: Date) {
        self.id = id
        self.code = code
        self.name = name
        self.phone = phone
        self.email = email
        self.defaultPriceTypeId = defaultPriceTypeId
        self.updatedAt = updatedAt
    }
}

public struct ProductDTO: Sendable {
    public let id: String
    public let code: String
    public let name: String
    public let categoryId: String?
    public let updatedAt: Date

    public init(id: String, code: String, name: String, categoryId: String?, updatedAt: Date) {
        self.id = id
        self.code = code
        self.name = name
        self.categoryId = categoryId
        self.updatedAt = updatedAt
    }
}
