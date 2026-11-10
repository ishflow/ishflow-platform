import Foundation

/// Push notification platform.
public enum PushPlatform: String, Codable, Sendable {
    /// Apple Push Notification service.
    case ios
    /// Firebase Cloud Messaging.
    case android
}

/// /api/mobile/push/register payload.
public struct PushRegisterRequest: Codable, Sendable {
    /// Provider-issued device token.
    public let token: String
    /// Provider platform.
    public let platform: PushPlatform
    /// Optional human-readable device label.
    public let deviceName: String?

    /// Initialize a push-registration request.
    public init(token: String, platform: PushPlatform, deviceName: String?) {
        self.token = token
        self.platform = platform
        self.deviceName = deviceName
    }
}

/// Empty JSON response used for endpoints that return `{}`.
public struct EmptyResponse: Decodable, Sendable {
    public init() {}
    public init(from _: Decoder) throws {
        self.init()
    }
}

/// A single notification record returned by `/api/mobile/notifications`.
public struct NotificationRecord: Codable, Sendable, Identifiable {
    /// Unique identifier.
    public let id: UUID
    /// Notification title.
    public let title: String
    /// Notification body text.
    public let message: String
    /// Creation timestamp.
    public let date: Date
    /// Whether the user has read it.
    public let isRead: Bool
    /// Optional deep-link path for navigation.
    public let deepLink: String?
}

/// Paginated list of notifications.
public typealias NotificationListResponse = PaginatedResponse<NotificationRecord>
