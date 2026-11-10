import Foundation

/// Page wrapper for list endpoints.
public struct PaginatedResponse<Item: Codable & Sendable>: Codable, Sendable {
    /// Items on the current page.
    public let items: [Item]
    /// Total number of items across all pages.
    public let total: Int
    /// 1-based page index.
    public let page: Int
    /// Page size used by the server.
    public let pageSize: Int

    enum CodingKeys: String, CodingKey {
        case items
        case total
        case page
        case pageSize
    }
}

/// API error envelope.
public struct ErrorResponse: Codable, Sendable {
    /// Human-readable error message.
    public let error: String
    /// Optional error code identifier.
    public let code: String?
    /// Optional structured error details.
    public let details: AnyCodable?
}

/// Heterogeneous JSON value.
public struct AnyCodable: Codable, Sendable {
    /// The decoded underlying value.
    public let value: any Sendable

    /// Decode from any JSON scalar / array / object.
    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let bool = try? container.decode(Bool.self) {
            value = bool
        } else if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let string = try? container.decode(String.self) {
            value = string
        } else if let array = try? container.decode([AnyCodable].self) {
            value = array
        } else if let dict = try? container.decode([String: AnyCodable].self) {
            value = dict
        } else {
            value = ""
        }
    }

    /// Encode the underlying value if it is a known JSON scalar type.
    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch value {
        case let bool as Bool: try container.encode(bool)
        case let int as Int: try container.encode(int)
        case let double as Double: try container.encode(double)
        case let string as String: try container.encode(string)
        default: try container.encodeNil()
        }
    }
}

/// Lightweight reference to a catalog item embedded in another payload.
///
/// Mirrors the shared mini-record the backend ships when a document or
/// register row references a catalog (customer, supplier, warehouse, etc.).
public struct CatalogRef: Codable, Sendable, Equatable, Hashable {
    /// Catalog item identifier.
    public let id: UUID
    /// Optional business code.
    public let code: String?
    /// Display name.
    public let name: String

    /// Construct a reference from raw fields.
    public init(id: UUID, code: String? = nil, name: String) {
        self.id = id
        self.code = code
        self.name = name
    }
}

/// Decimal string literal pattern (e.g. "12.50").
public struct DecimalString: Codable, Sendable, Equatable, ExpressibleByStringLiteral {
    /// Parsed decimal value.
    public let value: Decimal

    /// Wrap a decimal value.
    public init(_ value: Decimal) {
        self.value = value
    }

    /// Parse a decimal from a string literal; falls back to zero if invalid.
    public init(stringLiteral value: StringLiteralType) {
        self.value = Decimal(string: value) ?? .zero
    }

    /// Decode from a JSON string and validate as a decimal.
    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let raw = try container.decode(String.self)
        guard let decimal = Decimal(string: raw) else {
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Invalid decimal string: \(raw)"
            )
        }
        value = decimal
    }

    /// Encode as a decimal string.
    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(value.description)
    }
}
