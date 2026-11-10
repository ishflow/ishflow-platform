import AppShared
import Foundation
@testable import Onboarding
import XCTest

@MainActor
final class SetupProgressViewModelTests: XCTestCase {
    private var suiteName: String = ""
    private var defaults: UserDefaults!

    override func setUp() {
        super.setUp()
        suiteName = "SetupProgressViewModelTests-\(UUID().uuidString)"
        defaults = UserDefaults(suiteName: suiteName)
    }

    override func tearDown() {
        defaults.removePersistentDomain(forName: suiteName)
        defaults = nil
        super.tearDown()
    }

    // MARK: - Row projection

    func testEmptyProgressHidesRows() {
        let session = AppSession()
        let vm = SetupProgressViewModel(session: session, userDefaults: defaults)
        XCTAssertTrue(vm.rows.isEmpty)
        XCTAssertFalse(vm.isVisible)
    }

    func testAllFlagsFalseProducesSixPendingRows() {
        let session = makeSession(
            workspaceCreated: false,
            demoImported: false,
            invitesSent: false,
            firstCustomerAdded: false,
            firstProductAdded: false,
            firstInvoicePosted: false
        )
        let vm = SetupProgressViewModel(session: session, userDefaults: defaults)

        XCTAssertEqual(vm.rows.count, 6)
        XCTAssertTrue(vm.rows.allSatisfy { !$0.isComplete })
        XCTAssertTrue(vm.isVisible)
    }

    func testMixedFlags() {
        let session = makeSession(
            workspaceCreated: true,
            demoImported: true,
            invitesSent: false,
            firstCustomerAdded: false,
            firstProductAdded: false,
            firstInvoicePosted: false
        )
        let vm = SetupProgressViewModel(session: session, userDefaults: defaults)

        XCTAssertEqual(vm.rows.count, 6)
        XCTAssertTrue(vm.rows[0].isComplete) // workspaceCreated
        XCTAssertTrue(vm.rows[1].isComplete) // demoImported
        XCTAssertFalse(vm.rows[2].isComplete)
        XCTAssertFalse(vm.rows[3].isComplete)
        XCTAssertFalse(vm.rows[4].isComplete)
        XCTAssertFalse(vm.rows[5].isComplete)
        XCTAssertTrue(vm.isVisible)
    }

    func testAllFlagsTrueIsInvisible() {
        let session = makeSession(
            workspaceCreated: true,
            demoImported: true,
            invitesSent: true,
            firstCustomerAdded: true,
            firstProductAdded: true,
            firstInvoicePosted: true
        )
        let vm = SetupProgressViewModel(session: session, userDefaults: defaults)

        XCTAssertEqual(vm.rows.count, 6)
        XCTAssertTrue(vm.rows.allSatisfy { $0.isComplete })
        XCTAssertFalse(vm.isVisible)
    }

    // MARK: - Dismissal persistence

    func testHideForOneWeekPersistsDismissal() {
        let session = makeSession(
            workspaceCreated: true,
            demoImported: false,
            invitesSent: false,
            firstCustomerAdded: false,
            firstProductAdded: false,
            firstInvoicePosted: false
        )
        let vm = SetupProgressViewModel(session: session, userDefaults: defaults)
        XCTAssertTrue(vm.isVisible)

        vm.hideForOneWeek()
        XCTAssertFalse(vm.isVisible)

        let stored = defaults.object(forKey: "setupProgressDismissedUntil") as? Date
        XCTAssertNotNil(stored)
        XCTAssertGreaterThan(stored ?? Date.distantPast, Date())
    }

    func testUnhide() {
        let session = makeSession(
            workspaceCreated: true,
            demoImported: false,
            invitesSent: false,
            firstCustomerAdded: false,
            firstProductAdded: false,
            firstInvoicePosted: false
        )
        let vm = SetupProgressViewModel(session: session, userDefaults: defaults)

        vm.hideForOneWeek()
        XCTAssertFalse(vm.isVisible)

        vm.unhide()
        XCTAssertTrue(vm.isVisible)
        XCTAssertNil(defaults.object(forKey: "setupProgressDismissedUntil"))
    }

    // MARK: - Deep-link routing

    func testDeepLinkPaths() {
        let session = makeSession(
            workspaceCreated: false,
            demoImported: false,
            invitesSent: false,
            firstCustomerAdded: false,
            firstProductAdded: false,
            firstInvoicePosted: false
        )
        let vm = SetupProgressViewModel(session: session, userDefaults: defaults)

        let byId = Dictionary(uniqueKeysWithValues: vm.rows.map { ($0.id, $0) })
        XCTAssertNil(byId["workspaceCreated"]?.deepLinkPath)
        XCTAssertNil(byId["demoImported"]?.deepLinkPath)
        XCTAssertEqual(byId["invitesSent"]?.deepLinkPath, "/admin/members/invite")
        XCTAssertEqual(byId["firstCustomerAdded"]?.deepLinkPath, "/cari/new")
        XCTAssertEqual(byId["firstProductAdded"]?.deepLinkPath, "/prices/products/new")
        XCTAssertEqual(byId["firstInvoicePosted"]?.deepLinkPath, "/sales/invoice/new")
    }

    // MARK: - Helpers

    private func makeSession(
        workspaceCreated: Bool,
        demoImported: Bool,
        invitesSent: Bool,
        firstCustomerAdded: Bool,
        firstProductAdded: Bool,
        firstInvoicePosted: Bool
    ) -> AppSession {
        let session = AppSession()
        session.setupProgress = SetupProgress(
            workspaceCreated: workspaceCreated,
            demoImported: demoImported,
            invitesSent: invitesSent,
            firstCustomerAdded: firstCustomerAdded,
            firstProductAdded: firstProductAdded,
            firstInvoicePosted: firstInvoicePosted
        )
        return session
    }
}
