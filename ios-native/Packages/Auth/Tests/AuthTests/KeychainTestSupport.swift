@testable import Auth
import Foundation

/// Shared helpers for tests that touch the system keychain.
///
/// Unhosted SPM test bundles running on the iOS Simulator lack the keychain access-group
/// entitlement, so every `SecItemAdd`/`SecItemCopyMatching` call returns
/// `errSecMissingEntitlement` (-34018). The same tests pass cleanly on macOS via
/// `swift test` and inside a hosted app target. Rather than skip the whole file at
/// compile time, we probe the keychain at runtime and `XCTSkipIf` when the entitlement
/// is unavailable so coverage stays intact wherever it can run.
enum KeychainTestSupport {
    /// Returns `true` when the current process can read/write the generic-password
    /// keychain. Returns `false` when the Security framework reports
    /// `errSecMissingEntitlement` for a probe write — the signature of an unhosted
    /// iOS Simulator test run.
    static var canUseKeychain: Bool {
        let probe = Keychain(service: "test.ishflow.entitlement-probe")
        do {
            try probe.set("probe", forKey: "probe")
            try probe.delete(key: "probe")
            return true
        } catch let Keychain.KeychainError.status(status) where status == errSecMissingEntitlement {
            return false
        } catch {
            // Any other failure mode shouldn't mask the test — let it surface.
            return true
        }
    }
}
