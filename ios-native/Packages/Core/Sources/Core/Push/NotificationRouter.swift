import Foundation

#if canImport(UIKit) && os(iOS)
import UserNotifications

/// Handles incoming push notifications and routes them to the appropriate view.
@MainActor
public final class NotificationRouter: NSObject, @preconcurrency UNUserNotificationCenterDelegate {
    public static let shared = NotificationRouter()

    /// Notification posted when a deep-link is received from a push notification.
    public static let deeplinkReceived = Notification.Name("NotificationRouter.deeplinkReceived")

    private override init() {
        super.init()
        UNUserNotificationCenter.current().delegate = self
    }

    public func userNotificationCenter(
        _: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound, .badge])
    }

    public func userNotificationCenter(
        _: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        if let deepLink = userInfo["deepLink"] as? String {
            NotificationCenter.default.post(
                name: Self.deeplinkReceived,
                object: nil,
                userInfo: ["deeplink": deepLink]
            )
        }
        completionHandler()
    }
}
#else
public final class NotificationRouter {
    public static let shared = NotificationRouter()
    public static let deeplinkReceived = Notification.Name("NotificationRouter.deeplinkReceived")
}
#endif
