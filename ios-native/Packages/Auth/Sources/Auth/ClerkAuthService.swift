import Foundation
import os
#if canImport(UIKit) && os(iOS)
import AuthenticationServices
import UIKit
#endif

/// Default `AuthService` implementation. Drives sign-in through Clerk's hosted page via
/// `ASWebAuthenticationSession`, captures the JWT from the deep-link callback, and persists
/// it to the keychain.
@MainActor
public final class ClerkAuthService: AuthService {
    private let signInURL: URL
    private let signUpURL: URL
    private let callbackScheme: String
    private let keychain: Keychain
    private let tokenKey = "jwt"
    private static let logger = Logger(subsystem: "dev.ishflow.ios", category: "auth")

    /// Creates a service bound to sign-in / sign-up URLs, deep-link scheme, and keychain store.
    /// - Parameters:
    ///   - signInURL: The hosted Clerk sign-in URL, including any `return_url` query param.
    ///   - signUpURL: The hosted Clerk sign-up URL, including any `return_url` query param.
    ///   - callbackScheme: The URL scheme registered in `Info.plist` (e.g. `"ishflow"`).
    ///   - keychain: Storage for the JWT.
    public init(signInURL: URL, signUpURL: URL, callbackScheme: String, keychain: Keychain) {
        self.signInURL = signInURL
        self.signUpURL = signUpURL
        self.callbackScheme = callbackScheme
        self.keychain = keychain
    }

    /// Reads the cached JWT, or `nil` if no session is active.
    public func currentToken() async -> String? {
        try? keychain.get(key: tokenKey)
    }

    /// Persists a JWT to the keychain.
    public func persist(token: String) async throws {
        try keychain.set(token, forKey: tokenKey)
    }

    /// Clears the cached JWT.
    public func signOut() async throws {
        try keychain.delete(key: tokenKey)
    }

    /// Non-throwing variant of `signOut()` used by the 401 recovery path: drops a stale JWT from
    /// the keychain so the next bootstrap attempt forces a fresh sign-in. Any keychain error is
    /// swallowed because the caller cannot meaningfully recover from a delete failure mid-401.
    public func clearToken() async {
        try? keychain.delete(key: tokenKey)
    }

    /// Validates the callback URL, then either:
    ///   1. extracts the `token` query param, persists it, and returns it (success);
    ///   2. throws `AuthError.providerError(code:)` if the URL carries `?error=<code>` (Clerk
    ///      sign-in failure); or
    ///   3. throws `AuthError.missingTokenInCallback` if neither token nor error is present.
    public func handleCallback(url: URL) async throws -> String {
        // Strict shape check: the only legitimate callback is
        // `ishflow://auth/callback?...` delivered by the in-session
        // ASWebAuthenticationSession completion handler. Validating host + path
        // (not just the scheme) hardens this against malformed/foreign URLs.
        // Finding G-iOS1.
        guard url.scheme == callbackScheme, url.host == "auth", url.path == "/callback" else {
            throw AuthError.invalidCallbackURL
        }
        guard let comps = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            throw AuthError.invalidCallbackURL
        }
        Self.logger.debug(
            "Sign-in callback: host=\(url.host ?? "-", privacy: .public) path=\(url.path, privacy: .public) queryKeys=\(comps.queryItems?.map(\.name).joined(separator: ",") ?? "-", privacy: .public)"
        )
        if let errorCode = comps.queryItems?.first(where: { $0.name == "error" })?.value, !errorCode.isEmpty {
            Self.logger.error("Sign-in callback returned provider error: \(errorCode, privacy: .public)")
            throw AuthError.providerError(code: errorCode)
        }
        guard
            let token = comps.queryItems?.first(where: { $0.name == "token" })?.value,
            !token.isEmpty
        else {
            Self.logger.error("Sign-in callback missing token; query had no usable token param")
            throw AuthError.missingTokenInCallback
        }
        try keychain.set(token, forKey: tokenKey)
        return token
    }

    #if canImport(UIKit) && os(iOS)
    /// Presents the hosted Clerk sign-in page in `ASWebAuthenticationSession` and waits for the
    /// deep-link callback that carries the JWT.
    public func signIn() async throws -> String {
        try await authenticate(url: signInURL)
    }

    /// Presents the hosted Clerk sign-up page in `ASWebAuthenticationSession` and waits for the
    /// deep-link callback that carries the JWT.
    public func signUp() async throws -> String {
        try await authenticate(url: signUpURL)
    }

    /// Shared driver for the sign-in / sign-up flows: presents `url` in
    /// `ASWebAuthenticationSession` and waits for the deep-link callback that carries the JWT.
    private func authenticate(url: URL) async throws -> String {
        let scheme = callbackScheme
        let callbackURL: URL = try await withCheckedThrowingContinuation { continuation in
            // `ASWebAuthenticationSession`'s completion handler can fire more than once for some
            // redirect chains (the Clerk web bridge may deliver the `ishflow://` callback via both
            // an HTTP redirect and a JS fallback). Resuming the continuation twice traps the process
            // with SWIFT TASK CONTINUATION MISUSE, so funnel every branch through a one-shot guard.
            let guarded = ContinuationGuard(continuation)
            let session = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: scheme
            ) { url, error in
                let result: Result<URL, any Error>
                if let error = error as? ASWebAuthenticationSessionError, error.code == .canceledLogin {
                    result = .failure(AuthError.userCancelled)
                } else if let error {
                    result = .failure(error)
                } else if let url {
                    result = .success(url)
                } else {
                    result = .failure(AuthError.invalidCallbackURL)
                }
                if !guarded.resume(with: result) {
                    Self.logger.warning(
                        "ASWebAuthenticationSession callback fired again after the continuation resumed; ignoring duplicate"
                    )
                }
            }
            session.presentationContextProvider = SignInPresentationProvider.shared
            session.prefersEphemeralWebBrowserSession = true
            session.start()
        }
        return try await handleCallback(url: callbackURL)
    }
    #else
    /// Non-iOS stub. The interactive sign-in flow is iOS-only; this exists so the macOS host can
    /// still build the package for unit tests targeting `handleCallback` / `currentToken`.
    public func signIn() async throws -> String {
        throw AuthError.invalidCallbackURL
    }

    /// Non-iOS stub. The interactive sign-up flow is iOS-only; mirrors `signIn()`.
    public func signUp() async throws -> String {
        throw AuthError.invalidCallbackURL
    }
    #endif
}

/// One-shot wrapper that guarantees a `CheckedContinuation` is resumed at most once.
///
/// `ASWebAuthenticationSession`'s completion handler is not guaranteed to fire exactly once — some
/// redirect chains deliver the callback twice — and a second `continuation.resume` traps the
/// process (`SWIFT TASK CONTINUATION MISUSE`). This funnels every resume through a lock so the
/// first call wins and later calls are ignored instead of crashing.
final class ContinuationGuard<T>: @unchecked Sendable {
    private let lock = NSLock()
    private var continuation: CheckedContinuation<T, any Error>?

    init(_ continuation: CheckedContinuation<T, any Error>) {
        self.continuation = continuation
    }

    /// Resumes the continuation on the first call; ignores every later call.
    /// - Returns: `true` if this call resumed the continuation, `false` if it was a redundant invocation.
    @discardableResult
    func resume(with result: sending Result<T, any Error>) -> Bool {
        lock.lock()
        let continuation = self.continuation
        self.continuation = nil
        lock.unlock()
        continuation?.resume(with: result)
        return continuation != nil
    }
}

#if canImport(UIKit) && os(iOS)
@MainActor
private final class SignInPresentationProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
    static let shared = SignInPresentationProvider()
    func presentationAnchor(for _: ASWebAuthenticationSession) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first(where: \.isKeyWindow) ?? ASPresentationAnchor()
    }
}
#endif
