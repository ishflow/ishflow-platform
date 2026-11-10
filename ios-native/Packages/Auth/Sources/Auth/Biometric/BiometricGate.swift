import Foundation
import LocalAuthentication

/// Wraps LocalAuthentication framework for biometric (Face ID / Touch ID) gating.
/// Stores the last-success timestamp in the keychain so the gate survives reboots.
public actor BiometricGate {
    private let contextProvider: () -> LAContext
    private let keychain: Keychain
    private let lastAuthKey = "biometric.lastAuthTimestamp"
    private let enabledKey = "biometric.enabled"
    private let timeoutKey = "biometric.timeoutMinutes"

    /// Default timeout before re-prompting after backgrounding.
    public static let defaultTimeoutMinutes: Int = 5

    /// Creates a gate with an optional LAContext factory for testability.
    public init(
        keychain: Keychain = Keychain(service: "dev.ishflow.ios.biometric"),
        contextProvider: @escaping () -> LAContext = { LAContext() }
    ) {
        self.keychain = keychain
        self.contextProvider = contextProvider
    }

    /// Whether biometric authentication is enabled by the user.
    public var isEnabled: Bool {
        get {
            (try? keychain.get(key: enabledKey)) == "true"
        }
        set {
            try? keychain.set(newValue ? "true" : "false", forKey: enabledKey)
        }
    }

    /// Minutes before the gate requires re-authentication after backgrounding.
    public var timeoutMinutes: Int {
        get {
            guard let raw = try? keychain.get(key: timeoutKey),
                  let value = Int(raw) else {
                return Self.defaultTimeoutMinutes
            }
            return value
        }
        set {
            try? keychain.set(String(newValue), forKey: timeoutKey)
        }
    }

    /// Whether the device supports biometric authentication.
    public func canEvaluatePolicy() -> Bool {
        var error: NSError?
        let can = contextProvider().canEvaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics,
            error: &error
        )
        return can
    }

    /// Authenticates the user with biometrics.
    /// - Parameter reason: Localized reason shown in the system prompt.
    /// - Returns: `true` if authentication succeeded.
    public func authenticate(reason: String) async throws -> Bool {
        let context = contextProvider()
        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: reason
            )
            if success {
                try? keychain.set(
                    String(Date().timeIntervalSince1970),
                    forKey: lastAuthKey
                )
            }
            return success
        } catch {
            throw error
        }
    }

    /// Whether the gate should currently be locked (enabled and timeout exceeded).
    public func isLocked() -> Bool {
        guard isEnabled else { return false }
        guard let raw = try? keychain.get(key: lastAuthKey),
              let timestamp = TimeInterval(raw) else {
            return true
        }
        let elapsed = Date().timeIntervalSince1970 - timestamp
        return elapsed > Double(timeoutMinutes * 60)
    }

    /// Clears the last-auth timestamp, forcing the next check to lock.
    public func lock() {
        try? keychain.delete(key: lastAuthKey)
    }

    /// Convenience for tests to set enabled state from outside the actor.
    public func setEnabled(_ value: Bool) {
        isEnabled = value
    }

    /// Convenience for tests to set timeout from outside the actor.
    public func setTimeoutMinutes(_ value: Int) {
        timeoutMinutes = value
    }
}
