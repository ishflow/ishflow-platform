@testable import Auth
import XCTest

final class ClerkAuthServiceTests: XCTestCase {
    func testHandleCallbackExtractsToken() async throws {
        try XCTSkipIf(
            !KeychainTestSupport.canUseKeychain,
            "Keychain entitlement unavailable on unhosted iOS Simulator test bundle"
        )
        let keychain = Keychain(service: "test.ishflow.auth")
        try? keychain.delete(key: "jwt")
        let signIn = try XCTUnwrap(URL(string: "https://example.com/sign-in"))
        let signUp = try XCTUnwrap(URL(string: "https://example.com/sign-up"))
        let service = await ClerkAuthService(
            signInURL: signIn,
            signUpURL: signUp,
            callbackScheme: "ishflow",
            keychain: keychain
        )

        let url = try XCTUnwrap(URL(string: "ishflow://auth/callback?token=abc.def.ghi"))
        let token = try await service.handleCallback(url: url)
        XCTAssertEqual(token, "abc.def.ghi")
        let stored = await service.currentToken()
        XCTAssertEqual(stored, "abc.def.ghi")
        try? keychain.delete(key: "jwt")
    }

    func testHandleCallbackAcceptsInviteOriginToken() async throws {
        try XCTSkipIf(
            !KeychainTestSupport.canUseKeychain,
            "Keychain entitlement unavailable on unhosted iOS Simulator test bundle"
        )
        // An invite that routes through the web bridge mints the SAME
        // `ishflow://auth/callback?token=` deep link as the regular mobile
        // sign-in, so `handleCallback` must accept it identically.
        let keychain = Keychain(service: "test.ishflow.auth.invite")
        try? keychain.delete(key: "jwt")
        let signIn = try XCTUnwrap(URL(string: "https://example.com/sign-in"))
        let signUp = try XCTUnwrap(URL(string: "https://example.com/sign-up"))
        let service = await ClerkAuthService(
            signInURL: signIn,
            signUpURL: signUp,
            callbackScheme: "ishflow",
            keychain: keychain
        )

        let url = try XCTUnwrap(URL(string: "ishflow://auth/callback?token=abc"))
        let token = try await service.handleCallback(url: url)
        XCTAssertEqual(token, "abc")
        let stored = await service.currentToken()
        XCTAssertEqual(stored, "abc")
        try? keychain.delete(key: "jwt")
    }

    func testHandleCallbackRejectsMissingToken() async throws {
        let keychain = Keychain(service: "test.ishflow.auth.missing")
        let signIn = try XCTUnwrap(URL(string: "https://example.com/sign-in"))
        let signUp = try XCTUnwrap(URL(string: "https://example.com/sign-up"))
        let service = await ClerkAuthService(
            signInURL: signIn,
            signUpURL: signUp,
            callbackScheme: "ishflow",
            keychain: keychain
        )
        let url = try XCTUnwrap(URL(string: "ishflow://auth/callback"))
        do {
            _ = try await service.handleCallback(url: url)
            XCTFail("expected error")
        } catch AuthError.missingTokenInCallback {
            // expected
        } catch {
            XCTFail("wrong error: \(error)")
        }
    }

    func testHandleCallbackRejectsForeignHostAndPath() async throws {
        // Finding G-iOS1: a token must only be accepted from the exact
        // `ishflow://auth/callback` shape. A URL with a foreign host/path (an
        // attacker-crafted deep link) must be rejected before any token is stored.
        let keychain = Keychain(service: "test.ishflow.auth.foreign")
        let signIn = try XCTUnwrap(URL(string: "https://example.com/sign-in"))
        let signUp = try XCTUnwrap(URL(string: "https://example.com/sign-up"))
        let service = await ClerkAuthService(
            signInURL: signIn,
            signUpURL: signUp,
            callbackScheme: "ishflow",
            keychain: keychain
        )
        for bad in ["ishflow://evil/callback?token=abc", "ishflow://auth/steal?token=abc"] {
            let url = try XCTUnwrap(URL(string: bad))
            do {
                _ = try await service.handleCallback(url: url)
                XCTFail("expected rejection for \(bad)")
            } catch AuthError.invalidCallbackURL {
                // expected
            } catch {
                XCTFail("wrong error for \(bad): \(error)")
            }
        }
        XCTAssertNil(try? keychain.get(key: "jwt"))
        try? keychain.delete(key: "jwt")
    }

    func testContinuationGuardResumesOnlyOnce() async throws {
        // Resuming the underlying continuation twice traps the process
        // (SWIFT TASK CONTINUATION MISUSE) — exactly the sign-in crash. The guard
        // must let the first resume win and silently ignore the rest, so reaching
        // the assertion (no crash) is itself the proof the guard works.
        let value: Int = try await withCheckedThrowingContinuation { continuation in
            let guarded = ContinuationGuard(continuation)
            XCTAssertTrue(guarded.resume(with: .success(1)))
            XCTAssertFalse(guarded.resume(with: .success(2)))
            XCTAssertFalse(guarded.resume(with: .failure(AuthError.invalidCallbackURL)))
        }
        XCTAssertEqual(value, 1)
    }

    func testHandleCallbackPropagatesProviderError() async throws {
        let keychain = Keychain(service: "test.ishflow.auth.providererror")
        let signIn = try XCTUnwrap(URL(string: "https://example.com/sign-in"))
        let signUp = try XCTUnwrap(URL(string: "https://example.com/sign-up"))
        let service = await ClerkAuthService(
            signInURL: signIn,
            signUpURL: signUp,
            callbackScheme: "ishflow",
            keychain: keychain
        )
        let url = try XCTUnwrap(URL(string: "ishflow://auth/callback?error=access_denied"))
        do {
            _ = try await service.handleCallback(url: url)
            XCTFail("expected error")
        } catch AuthError.providerError(let code) {
            XCTAssertEqual(code, "access_denied")
        } catch {
            XCTFail("wrong error: \(error)")
        }
    }
}
