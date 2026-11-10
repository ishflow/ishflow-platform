import Foundation

#if canImport(UIKit) && os(iOS)
import UIKit
import UserNotifications

/// Wraps APNs registration and device-token formatting. iOS-only — the macOS
/// build gets a no-op stub so the Core package can still be tested on the host.
public actor PushService {
    /// Shared instance for convenience.
    public static let shared = PushService()

    /// Create a new push service. Stateless; safe to instantiate per app launch.
    public init() {}

    /// Request notification authorization (alert + badge + sound) and, on success,
    /// trigger APNs registration so the OS hands a device token to the app delegate.
    /// - Returns: `true` if the user granted authorization.
    public func requestAuthorizationAndRegister() async throws -> Bool {
        return try await requestAuthorizationIfNeeded()
    }

    /// Request notification authorization if not already granted, then trigger APNs registration.
    /// - Returns: `true` if the user granted authorization.
    public func requestAuthorizationIfNeeded() async throws -> Bool {
        let granted = try await UNUserNotificationCenter.current()
            .requestAuthorization(options: [.alert, .badge, .sound])
        if granted {
            await MainActor.run {
                UIApplication.shared.registerForRemoteNotifications()
            }
        }
        return granted
    }

    /// Convert raw APNs device-token bytes into the lowercase hex string
    /// expected by the backend `/v1/push/devices` endpoint.
    public func tokenString(from data: Data) -> String {
        data.map { String(format: "%02x", $0) }.joined()
    }
}
#else
/// Host-side (macOS / Linux) stub so the Core package builds and tests on
/// platforms that do not ship UIKit + UserNotifications.
public actor PushService {
    /// Create a stub push service.
    public init() {}

    /// Stubbed authorization request — always returns `false` off-device.
    public func requestAuthorizationAndRegister() async throws -> Bool {
        false
    }

    /// Hex-string conversion still works on the host so unit tests can exercise it.
    public func tokenString(from data: Data) -> String {
        data.map { String(format: "%02x", $0) }.joined()
    }
}
#endif
