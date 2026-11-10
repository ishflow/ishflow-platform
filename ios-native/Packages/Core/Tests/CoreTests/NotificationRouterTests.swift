@testable import Core
import XCTest

final class NotificationRouterTests: XCTestCase {
    @MainActor
    func testDeeplinkReceivedNotification() {
        let expectation = self.expectation(forNotification: NotificationRouter.deeplinkReceived, object: nil) { notification in
            guard let userInfo = notification.userInfo,
                  let deeplink = userInfo["deeplink"] as? String else {
                return false
            }
            return deeplink == "ishflow://invoice/abc123"
        }

        NotificationCenter.default.post(
            name: NotificationRouter.deeplinkReceived,
            object: nil,
            userInfo: ["deeplink": "ishflow://invoice/abc123"]
        )

        wait(for: [expectation], timeout: 1.0)
    }
}
