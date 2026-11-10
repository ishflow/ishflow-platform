import Foundation
import Security

/// Lightweight wrapper around the iOS keychain (`kSecClassGenericPassword`) used to persist the
/// authenticated JWT across launches. Items are scoped by `service` so multiple environments
/// (dev / prod / tests) can coexist without collisions.
public struct Keychain: Sendable {
    /// Errors surfaced from the underlying Security framework calls.
    public enum KeychainError: Error {
        /// The Security framework returned a non-success `OSStatus`.
        case status(OSStatus)
        /// The value could not be converted to/from UTF-8 data.
        case dataConversion
    }

    private let service: String

    /// Creates a keychain accessor scoped to the given service identifier.
    /// - Parameter service: A reverse-DNS style identifier, e.g. `"dev.ishflow.ios.auth"`.
    public init(service: String) {
        self.service = service
    }

    /// Stores `value` under `key`, replacing any prior entry. Items are written with
    /// `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` so they survive relaunches but never
    /// leave the device.
    public func set(_ value: String, forKey key: String) throws {
        guard let data = value.data(using: .utf8) else { throw KeychainError.dataConversion }
        try delete(key: key)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]
        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else { throw KeychainError.status(status) }
    }

    /// Reads the value stored under `key`, or `nil` if no item exists.
    public func get(key: String) throws -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess else { throw KeychainError.status(status) }
        guard let data = item as? Data, let string = String(data: data, encoding: .utf8) else {
            throw KeychainError.dataConversion
        }
        return string
    }

    /// Removes the value stored under `key`. A missing entry is treated as success.
    public func delete(key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.status(status)
        }
    }
}
