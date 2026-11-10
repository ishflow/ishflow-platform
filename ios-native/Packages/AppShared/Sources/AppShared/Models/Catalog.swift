import Foundation

/// Lightweight `{id, name}` reference returned alongside catalog rows when
/// the server has resolved a foreign-key for the mobile client (e.g.
/// `customer.defaultPriceType`).
public struct CatalogRefSummary: Codable, Sendable, Equatable {
    public let id: String
    public let name: String
    public init(id: String, name: String) {
        self.id = id
        self.name = name
    }
}

/// Catalog record returned by list/create endpoints.
///
/// Required fields cover the legacy MVP shape; every extension field is
/// `decodeIfPresent` so older payloads continue to decode without
/// modification. Product-specific fields (`unit`, `costPrice`,
/// `salePrice`, `barcode`) and party-specific fields (`phone`, `email`)
/// share the same record type since the backend already does.
public struct CatalogRecord: Codable, Sendable, Equatable {
    /// Catalog item identifier.
    public let id: UUID
    /// Optional business code.
    public let code: String?
    /// Display name.
    public let name: String
    /// Server-side creation timestamp.
    public let createdAt: Date
    /// Server-side last-update timestamp.
    public let updatedAt: Date
    /// Unit of measure (products only).
    public let unit: String?
    /// Cost price (products only).
    public let costPrice: DecimalString?
    /// Sale price (products only).
    public let salePrice: DecimalString?
    /// Barcode (products only).
    public let barcode: String?
    /// Phone number (counterparties).
    public let phone: String?
    /// Email address (counterparties).
    public let email: String?
    /// Category foreign-key (products only).
    public let categoryId: String?
    /// Group foreign-key (products only).
    public let groupId: String?
    /// Resolved customer default price-type (sales.customer rows only).
    /// The server enriches the row with `{ id, name }` so iOS can auto-fill
    /// the wizard's price-type picker without an extra fetch.
    public let defaultPriceType: CatalogRefSummary?

    enum CodingKeys: String, CodingKey {
        case id
        case code
        case name
        case createdAt
        case updatedAt
        case unit
        case costPrice
        case salePrice
        case barcode
        case phone
        case email
        case categoryId
        case groupId
        case defaultPriceType
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        code = try container.decodeIfPresent(String.self, forKey: .code)
        name = try container.decode(String.self, forKey: .name)
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        updatedAt = try container.decode(Date.self, forKey: .updatedAt)
        unit = try container.decodeIfPresent(String.self, forKey: .unit)
        costPrice = try container.decodeIfPresent(DecimalString.self, forKey: .costPrice)
        salePrice = try container.decodeIfPresent(DecimalString.self, forKey: .salePrice)
        barcode = try container.decodeIfPresent(String.self, forKey: .barcode)
        phone = try container.decodeIfPresent(String.self, forKey: .phone)
        email = try container.decodeIfPresent(String.self, forKey: .email)
        categoryId = try container.decodeIfPresent(String.self, forKey: .categoryId)
        groupId = try container.decodeIfPresent(String.self, forKey: .groupId)
        defaultPriceType = try container.decodeIfPresent(CatalogRefSummary.self, forKey: .defaultPriceType)
    }

    public init(
        id: UUID,
        code: String? = nil,
        name: String,
        createdAt: Date,
        updatedAt: Date,
        unit: String? = nil,
        costPrice: DecimalString? = nil,
        salePrice: DecimalString? = nil,
        barcode: String? = nil,
        phone: String? = nil,
        email: String? = nil,
        categoryId: String? = nil,
        groupId: String? = nil,
        defaultPriceType: CatalogRefSummary? = nil
    ) {
        self.id = id
        self.code = code
        self.name = name
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.unit = unit
        self.costPrice = costPrice
        self.salePrice = salePrice
        self.barcode = barcode
        self.phone = phone
        self.email = email
        self.categoryId = categoryId
        self.groupId = groupId
        self.defaultPriceType = defaultPriceType
    }
}

/// Returned by POST /api/mobile/catalogs/:type.
public struct CatalogCreateResponse: Codable, Sendable {
    /// Identifier of the newly created catalog item.
    public let id: UUID
    /// Persisted catalog record.
    public let record: CatalogRecord
}

/// Paginated list of catalog records.
public typealias CatalogListResponse = PaginatedResponse<CatalogRecord>
