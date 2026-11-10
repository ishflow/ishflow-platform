import APIClient
import AppShared
import Settings
import SnapshotTesting
import SwiftUI
import XCTest

@MainActor
final class SettingsRootViewSnapshotTests: XCTestCase {
    func testRootLight() {
        let view = SettingsRootView(
            api: DemoAPIClient(),
            onSignOut: {},
            onSwitchTenant: { _ in },
            fetchFailedMutations: { [] },
            retryFailedMutation: { _ in }
        )
        .environment(AppSession.fixtureRUB)
        assertSnapshot(of: view, as: .iPhone17Light)
    }

    func testRootDark() {
        let view = SettingsRootView(
            api: DemoAPIClient(),
            onSignOut: {},
            onSwitchTenant: { _ in },
            fetchFailedMutations: { [] },
            retryFailedMutation: { _ in }
        )
        .environment(AppSession.fixtureRUB)
        assertSnapshot(of: view, as: .iPhone17Dark)
    }
}

@MainActor
private extension AppSession {
    static var fixtureRUB: AppSession {
        let session = AppSession()
        session.user = UserSummary(
            id: UUID(uuidString: "00000000-0000-0000-0000-0000000000aa")!,
            email: "demo@ishflow.com",
            firstName: "Demo",
            lastName: "User",
            imageUrl: nil
        )
        session.tenant = TenantSummary(
            id: UUID(uuidString: "00000000-0000-0000-0000-0000000000bb")!,
            slug: "demo",
            name: "Ishflow Demo",
            currency: "RUB",
            mobileFeatures: MobileFeatures()
        )
        session.permissions = []
        return session
    }
}
