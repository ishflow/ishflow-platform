import UIKit
import UserNotifications

/// App delegate that bridges APNs lifecycle events into SwiftUI.
@MainActor
final class AppDelegate: NSObject, UIApplicationDelegate, @preconcurrency UNUserNotificationCenterDelegate {
    var onAPNsToken: ((Data) -> Void)?
    var onAPNsFailure: ((Error) -> Void)?
    var onNotificationTap: ((String) -> Void)?
    var onQuickAction: ((String) -> Void)?

    func application(
        _: UIApplication,
        didFinishLaunchingWithOptions _: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    nonisolated func application(
        _: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        Task { @MainActor in
            onAPNsToken?(deviceToken)
        }
    }

    nonisolated func application(
        _: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        Task { @MainActor in
            onAPNsFailure?(error)
        }
    }

    func userNotificationCenter(
        _: UNUserNotificationCenter,
        willPresent _: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound, .badge])
    }

    func userNotificationCenter(
        _: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        if let deepLink = response.notification.request.content.userInfo["deepLink"] as? String {
            onNotificationTap?(deepLink)
        }
        completionHandler()
    }

    func application(
        _: UIApplication,
        performActionFor shortcutItem: UIApplicationShortcutItem,
        completionHandler: @escaping (Bool) -> Void
    ) {
        let deepLink: String?
        switch shortcutItem.type {
        case "com.uba.ishflow.quickaction.newSale":
            deepLink = "ishflow://sales/new"
        case "com.uba.ishflow.quickaction.todaysAR":
            deepLink = "ishflow://reports/ar"
        case "com.uba.ishflow.quickaction.scanBarcode":
            deepLink = "ishflow://inventory/scan"
        default:
            deepLink = nil
        }
        if let deepLink {
            onQuickAction?(deepLink)
        }
        completionHandler(deepLink != nil)
    }
}
