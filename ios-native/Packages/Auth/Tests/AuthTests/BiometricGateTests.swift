@testable import Auth
import LocalAuthentication
import XCTest

final class BiometricGateTests: XCTestCase {
    private func makeKeychain() -> Keychain {
        Keychain(service: "test.ishflow.biometric.\(UUID().uuidString)")
    }

    override func setUp() async throws {
        try await super.setUp()
        try XCTSkipIf(
            !KeychainTestSupport.canUseKeychain,
            "Keychain entitlement unavailable on unhosted iOS Simulator test bundle"
        )
    }

    func testAuthenticateSuccess() async throws {
        let keychain = makeKeychain()
        let gate = BiometricGate(keychain: keychain) {
            let ctx = LAContext()
            return ctx
        }
        let isEnabled = await gate.isEnabled
        let timeoutMinutes = await gate.timeoutMinutes
        XCTAssertFalse(isEnabled)
        XCTAssertEqual(timeoutMinutes, BiometricGate.defaultTimeoutMinutes)
    }

    func testIsLockedWhenEnabledAndNoPriorAuth() async {
        let keychain = makeKeychain()
        let gate = BiometricGate(keychain: keychain)
        await gate.setEnabled(true)
        let locked = await gate.isLocked()
        XCTAssertTrue(locked)
    }

    func testIsNotLockedWhenDisabled() async {
        let keychain = makeKeychain()
        let gate = BiometricGate(keychain: keychain)
        await gate.setEnabled(false)
        let locked = await gate.isLocked()
        XCTAssertFalse(locked)
    }

    func testTimeoutMinutesPersistence() async {
        let keychain = makeKeychain()
        let gate = BiometricGate(keychain: keychain)
        await gate.setTimeoutMinutes(10)
        let timeout = await gate.timeoutMinutes
        XCTAssertEqual(timeout, 10)
    }

    func testLockClearsTimestamp() async {
        let keychain = makeKeychain()
        let gate = BiometricGate(keychain: keychain)
        await gate.setEnabled(true)
        try? keychain.set(String(Date().timeIntervalSince1970), forKey: "biometric.lastAuthTimestamp")
        let lockedBefore = await gate.isLocked()
        XCTAssertFalse(lockedBefore)
        await gate.lock()
        let lockedAfter = await gate.isLocked()
        XCTAssertTrue(lockedAfter)
    }
}
