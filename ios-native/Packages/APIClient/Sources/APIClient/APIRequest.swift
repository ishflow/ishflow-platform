import Foundation

/// HTTP method used by an `APIRequest`.
public enum HTTPMethod: String, Sendable {
    /// GET method.
    case get = "GET"
    /// POST method.
    case post = "POST"
    /// PUT method.
    case put = "PUT"
    /// DELETE method.
    case delete = "DELETE"
    /// PATCH method.
    case patch = "PATCH"
}

/// A typed HTTP request that can be dispatched by an `APIClient`.
public protocol APIRequest: Sendable {
    /// The decoded response type expected for this request.
    associatedtype Response: Decodable & Sendable

    /// Path appended to the client's base URL.
    var path: String { get }
    /// HTTP method to use.
    var method: HTTPMethod { get }
    /// Optional query string parameters.
    var query: [String: String]? { get }
    /// Optional encodable request body.
    var body: (any Encodable & Sendable)? { get }
    /// Whether the request needs an `Idempotency-Key` header.
    var idempotent: Bool { get }
}

public extension APIRequest {
    /// Default: no query string.
    var query: [String: String]? {
        nil
    }

    /// Default: no body.
    var body: (any Encodable & Sendable)? {
        nil
    }

    /// Default: idempotent for mutating methods so retries are safe.
    var idempotent: Bool {
        method == .post || method == .put || method == .patch
    }
}
