import Foundation

/// Dispatches typed `APIRequest` values and returns their decoded responses.
public protocol APIClient: Sendable {
    /// Sends `request` and returns its decoded response, or throws `APIError`.
    func send<R: APIRequest>(_ request: R) async throws -> R.Response
}
