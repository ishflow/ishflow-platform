import Foundation

/// Document workflow status.
public enum DocumentStatus: String, Codable, Sendable {
    /// Local-only draft.
    case draft = "DRAFT"
    /// Saved on the server but not posted.
    case saved = "SAVED"
    /// Posted to registers.
    case posted = "POSTED"
    /// Cancelled.
    case cancelled = "CANCELLED"
}

/// One row inside a `DocumentRecord`.
///
/// Backend ships line items embedded under `lines` for documents with
/// tabular content (sales invoice, purchase invoice, etc.).
public struct DocumentLine: Codable, Sendable, Equatable {
    /// Line identifier.
    public let id: UUID
    /// Linked product identifier.
    public let productId: UUID
    /// Optional embedded product reference.
    public let product: CatalogRef?
    /// Quantity on this line.
    public let quantity: DecimalString
    /// Unit price applied on this line.
    public let unitPrice: DecimalString
    /// Pre-computed quantity * unitPrice.
    public let rowTotal: DecimalString

    public init(
        id: UUID,
        productId: UUID,
        product: CatalogRef? = nil,
        quantity: DecimalString,
        unitPrice: DecimalString,
        rowTotal: DecimalString
    ) {
        self.id = id
        self.productId = productId
        self.product = product
        self.quantity = quantity
        self.unitPrice = unitPrice
        self.rowTotal = rowTotal
    }
}

/// Document record returned by list/create endpoints.
///
/// Required fields cover the legacy MVP shape; every extension field is
/// `decodeIfPresent` so older payloads (and minimal demo fixtures)
/// continue to decode without modification.
public struct DocumentRecord: Codable, Sendable, Equatable {
    /// Document identifier.
    public let id: UUID
    /// Business document number.
    public let number: String
    /// Business document date.
    public let date: Date
    /// Workflow status.
    public let status: DocumentStatus
    /// Server-side creation timestamp.
    public let createdAt: Date
    /// Server-side last-update timestamp.
    public let updatedAt: Date
    /// Linked customer identifier (sales documents).
    public let customerId: UUID?
    /// Optional embedded customer reference.
    public let customer: CatalogRef?
    /// Linked supplier identifier (purchase documents).
    public let supplierId: UUID?
    /// Optional embedded supplier reference.
    public let supplier: CatalogRef?
    /// Linked warehouse identifier.
    public let warehouseId: UUID?
    /// Optional embedded warehouse reference.
    public let warehouse: CatalogRef?
    /// Linked price type identifier.
    public let priceTypeId: UUID?
    /// Optional embedded price type reference.
    public let priceType: CatalogRef?
    /// Free-form comment.
    public let comment: String?
    /// Document grand total.
    public let total: DecimalString?
    /// Embedded line items, if present.
    public let lines: [DocumentLine]?

    enum CodingKeys: String, CodingKey {
        case id
        case number
        case date
        case status
        case createdAt
        case updatedAt
        case customerId
        case customer
        case supplierId
        case supplier
        case warehouseId
        case warehouse
        case priceTypeId
        case priceType
        case comment
        case total
        case lines
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        number = try container.decode(String.self, forKey: .number)
        date = try container.decode(Date.self, forKey: .date)
        status = try container.decode(DocumentStatus.self, forKey: .status)
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        updatedAt = try container.decode(Date.self, forKey: .updatedAt)
        // The backend ships ref-typed header columns (`customer`, `warehouse`,
        // `priceType`) as raw FK UUID strings on the list/detail endpoints.
        // The iOS model wants both the raw id (`customerId`) AND an optional
        // embedded `CatalogRef` so future enriched payloads "just work". We
        // therefore try the embedded object first and fall back to a string
        // UUID for the `*Id` field. If both keys are present (enriched
        // response), we use them as authored.
        (customerId, customer) = try Self.decodeRefPair(
            container,
            idKey: .customerId,
            refKey: .customer
        )
        (supplierId, supplier) = try Self.decodeRefPair(
            container,
            idKey: .supplierId,
            refKey: .supplier
        )
        (warehouseId, warehouse) = try Self.decodeRefPair(
            container,
            idKey: .warehouseId,
            refKey: .warehouse
        )
        (priceTypeId, priceType) = try Self.decodeRefPair(
            container,
            idKey: .priceTypeId,
            refKey: .priceType
        )
        comment = try container.decodeIfPresent(String.self, forKey: .comment)
        total = try container.decodeIfPresent(DecimalString.self, forKey: .total)
        lines = try container.decodeIfPresent([DocumentLine].self, forKey: .lines)
    }

    /// Decode a header-level reference column tolerant of either:
    ///   - a raw FK UUID string under `refKey` (current list endpoint), or
    ///   - an embedded `{ id, code?, name }` object under `refKey`
    ///     accompanied by an explicit `idKey` (future enriched response).
    private static func decodeRefPair(
        _ container: KeyedDecodingContainer<CodingKeys>,
        idKey: CodingKeys,
        refKey: CodingKeys
    ) throws -> (UUID?, CatalogRef?) {
        var resolvedId = try container.decodeIfPresent(UUID.self, forKey: idKey)
        var resolvedRef: CatalogRef?
        if let ref = (try? container.decodeIfPresent(CatalogRef.self, forKey: refKey))
            ?? nil
        {
            resolvedRef = ref
            if resolvedId == nil { resolvedId = ref.id }
        } else if let rawId = (try? container.decodeIfPresent(UUID.self, forKey: refKey))
            ?? nil
        {
            // Backend currently ships the FK UUID directly under `refKey`.
            if resolvedId == nil { resolvedId = rawId }
        }
        return (resolvedId, resolvedRef)
    }

    public init(
        id: UUID, number: String, date: Date, status: DocumentStatus,
        createdAt: Date, updatedAt: Date,
        customerId: UUID? = nil, customer: CatalogRef? = nil,
        supplierId: UUID? = nil, supplier: CatalogRef? = nil,
        warehouseId: UUID? = nil, warehouse: CatalogRef? = nil,
        priceTypeId: UUID? = nil, priceType: CatalogRef? = nil,
        comment: String? = nil, total: DecimalString? = nil, lines: [DocumentLine]? = nil
    ) {
        self.id = id
        self.number = number
        self.date = date
        self.status = status
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.customerId = customerId
        self.customer = customer
        self.supplierId = supplierId
        self.supplier = supplier
        self.warehouseId = warehouseId
        self.warehouse = warehouse
        self.priceTypeId = priceTypeId
        self.priceType = priceType
        self.comment = comment
        self.total = total
        self.lines = lines
    }
}

/// Returned by POST /api/mobile/documents/:type.
public struct DocumentCreateResponse: Codable, Sendable {
    /// Identifier of the newly created document.
    public let id: UUID
    /// Persisted document record.
    public let record: DocumentRecord
}

/// Returned by POST .../post.
public struct DocumentPostResponse: Codable, Sendable {
    /// Number of register movements emitted by this posting.
    public let movementCount: Int
}

/// Paginated list of documents.
public typealias DocumentListResponse = PaginatedResponse<DocumentRecord>
