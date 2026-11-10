import Foundation

/// Abstract authentication boundary. Concrete implementations drive the sign-in flow,
/// persist the resulting JWT, and surface it to API clients on demand.
public protocol AuthService: Sendable {
    /// Returns the cached JWT, or `nil` if no session is currently active.
    func currentToken() async -> String?
    /// Drives the user through an interactive sign-in flow and returns the resulting JWT.
    func signIn() async throws -> String
    /// Drives the user through an interactive sign-up flow and returns the resulting JWT.
    func signUp() async throws -> String
    /// Clears the cached session (server-side revocation is out of scope).
    func signOut() async throws
    /// Handles a deep-link callback URL emitted by the web sign-in flow.
    /// Extracts and persists the JWT, returning it on success.
    func handleCallback(url: URL) async throws -> String
    /// Replaces the current cached token with a new one — used by onboarding
    /// when the server re-mints a JWT carrying the new tenant claim.
    func persist(token: String) async throws
}

/// Failure modes for the authentication flow.
public enum AuthError: Error, Sendable {
    /// The user dismissed the in-app browser before completing sign-in.
    case userCancelled
    /// The callback URL did not include a `token` query parameter.
    case missingTokenInCallback
    /// The callback URL did not match the registered scheme or was otherwise malformed.
    case invalidCallbackURL
    /// Clerk (or another upstream provider) redirected with an `?error=<code>` query param.
    /// `code` is the raw upstream code so logs keep it; UI maps it to a localized message.
    case providerError(code: String)
}
