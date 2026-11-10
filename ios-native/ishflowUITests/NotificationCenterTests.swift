import XCTest

/// End-to-end UI test for the sync/offline notification center.
///
/// Launches with `-uiTestSeedNotifications`, which seeds the real `SyncQueue`
/// (via the same model store the API client writes to) with one failed write
/// and one offline-waiting mutation. It then verifies, through the real
/// SwiftUI surface, that:
///
///   1. The dashboard bell shows a badge value of "2"
///      (1 sync error + a single offline-waiting bump).
///   2. Opening the bell reveals a "Senkronizasyon hatası" row.
///   3. ...and a "Çevrimdışı bekliyor" row.
///
/// Assertions are accessibility-identifier based, so they're locale-independent
/// (the app ships ru/en/tr). No screenshots required.
final class NotificationCenterTests: XCTestCase {
    override func setUp() {
        super.setUp()
        continueAfterFailure = false
    }

    func testSeededSyncErrorAndOfflineSurfaceInCenterWithBadge() {
        let app = XCUIApplication()
        app.launchArguments += ["-uiTestSeedNotifications"]
        app.launch()

        // Reach the dashboard. In DEBUG the app auto-authenticates via the
        // dev-bypass keychain token and skips the sign-in screen; if the demo
        // "Skip" button does appear instead, take it. Either way the real
        // SyncQueue (seeded above) backs the badge + center.
        let skipButton = app.buttons["auth.skip"]
        if skipButton.waitForExistence(timeout: 5) {
            skipButton.tap()
        }

        // The dashboard bell carries the unread badge.
        let bell = app.buttons["notifCenter.bell"]
        XCTAssertTrue(bell.waitForExistence(timeout: 25), "Notification bell should appear on the dashboard")

        // Badge = failed(1) + offline-waiting(1) = "2". The badge value is
        // populated by an async queue read, so poll briefly.
        XCTAssertTrue(
            waitForValue(bell, equals: "2", timeout: 6),
            "Bell badge should read 2 (got \(bell.value as? String ?? "nil"))"
        )

        bell.tap()

        // Bildirimler tab is selected first; both synthesized rows should render.
        let syncErrorRow = app.descendants(matching: .any)["notif.row.syncError"].firstMatch
        XCTAssertTrue(
            syncErrorRow.waitForExistence(timeout: 6),
            "A sync-error notification row should be listed"
        )

        let offlineRow = app.descendants(matching: .any)["notif.row.offline"].firstMatch
        XCTAssertTrue(
            offlineRow.waitForExistence(timeout: 6),
            "An offline-waiting notification row should be listed"
        )
    }

    /// Polls `element.value` until it equals `expected` or the timeout elapses.
    private func waitForValue(_ element: XCUIElement, equals expected: String, timeout: TimeInterval) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if (element.value as? String) == expected { return true }
            usleep(200_000) // 0.2s
        }
        return (element.value as? String) == expected
    }
}
