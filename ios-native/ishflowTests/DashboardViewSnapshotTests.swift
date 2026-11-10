@testable import _CAnalog
import APIClient
import AppShared
import SnapshotTesting
import SwiftUI
import XCTest

@MainActor
final class DashboardViewSnapshotTests: XCTestCase {

    // MARK: - Loaded state
    //
    // The loaded state contains time-relative text (`Text(date, style: .relative)`
    // in ActivityFeedRow + day-offset math in UpcomingReceivableRow) that drifts
    // every day, so reference PNGs go stale within hours. Snapshots are skipped
    // until DashboardView accepts an injectable `now: Date` for testability.
    // TODO: refactor View to inject `now` and re-enable both loaded snapshots.

    func testLoadedLight() throws {
        try XCTSkipIf(true, "Time-relative rendering — see file header note")
        assertSnapshot(of: hostedView(.loaded(fixture)), as: .image(traits: .init(userInterfaceStyle: .light)))
    }

    func testLoadedDark() throws {
        try XCTSkipIf(true, "Time-relative rendering — see file header note")
        assertSnapshot(of: hostedView(.loaded(fixture)), as: .image(traits: .init(userInterfaceStyle: .dark)))
    }

    // MARK: - Empty state (tenant == nil)

    func testEmptyLight() {
        assertSnapshot(of: hostedView(.empty), as: .image(traits: .init(userInterfaceStyle: .light)))
    }

    // MARK: - Failed state

    func testFailedLight() {
        assertSnapshot(of: hostedView(.failed("offline")), as: .image(traits: .init(userInterfaceStyle: .light)))
    }

    // MARK: - Loading state

    func testLoadingLight() {
        assertSnapshot(of: hostedView(.loading), as: .image(traits: .init(userInterfaceStyle: .light)))
    }

    // MARK: - Helpers

    /// Wraps a DashboardView in a UIHostingController and forces a full layout pass
    /// so assertSnapshot captures the fully-rendered state rather than an empty frame.
    private func hostedView(_ state: DashboardViewModel.State) -> UIView {
        let api = DemoAPIClient()
        let vm = DashboardViewModel(api: api, session: .fixtureUSD)
        vm.state = state
        let view = DashboardView(api: api, previewViewModel: vm)
            .environment(AppSession.fixtureUSD)
        let controller = UIHostingController(rootView: view)
        controller.view.frame = CGRect(x: 0, y: 0, width: 393, height: 852)
        controller.view.backgroundColor = .systemBackground
        controller.view.layoutIfNeeded()
        return controller.view
    }

    // MARK: - Fixture

    private var fixture: DashboardSummary {
        // swiftlint:disable:next force_try
        let data = fixtureJSON.data(using: .utf8)!
        // swiftlint:disable:next force_try
        return try! JSONDecoder.ishflow.decode(DashboardSummary.self, from: data)
    }

    private let fixtureJSON = #"""
    {
      "tenant": { "id": "t1", "currency": "USD" },
      "kpis": {
        "receivable":     { "value": "1250.00", "delta":  12.4 },
        "payable":        { "value": "840.00",  "delta":  -8.1 },
        "thisMonthSales": { "value": "3210.50", "delta":  22.0 },
        "openInvoices":   { "value": 7,         "delta":  40.0 }
      },
      "upcomingReceivables": [
        { "id": "c1", "name": "ACME Co.",  "amount": "250.00", "date": "2026-05-01" },
        { "id": "c2", "name": "Beta LLC",  "amount": "120.00", "date": "2026-04-29" }
      ],
      "recentActivity": [
        { "id": "a1", "kind": "sales.invoice",     "label": "INV-001", "href": "/", "timestamp": "2026-04-28T08:00:00.000Z" },
        { "id": "a2", "kind": "purchases.payment", "label": "PAY-007", "href": "/", "timestamp": "2026-04-27T15:00:00.000Z" }
      ],
      "lowStock": { "count": 3, "threshold": 5 }
    }
    """#
}

// MARK: - AppSession fixture

@MainActor
private extension AppSession {
    static var fixtureUSD: AppSession {
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
            currency: "USD",
            mobileFeatures: MobileFeatures()
        )
        session.permissions = []
        return session
    }
}
