import AppShared
import Foundation
import Observation

/// A single row inside the `SetupProgressWidget` checklist. `deepLinkPath` is
/// the ishflow:// path the row taps into when incomplete — `nil` for rows that
/// have no actionable destination (workspace creation, demo import, already
/// complete).
public struct SetupProgressRow: Sendable, Equatable, Identifiable {
    public let id: String
    public let titleKey: String
    public let isComplete: Bool
    public let deepLinkPath: String?

    public init(id: String, titleKey: String, isComplete: Bool, deepLinkPath: String?) {
        self.id = id
        self.titleKey = titleKey
        self.isComplete = isComplete
        self.deepLinkPath = deepLinkPath
    }
}

/// View model behind `SetupProgressWidget`. Reads `AppSession.setupProgress`,
/// projects it onto an ordered list of rows, and exposes "hide for a week"
/// dismissal persisted to `UserDefaults` under `setupProgressDismissedUntil`.
@Observable
@MainActor
public final class SetupProgressViewModel {
    public private(set) var rows: [SetupProgressRow] = []

    /// True when the widget should render: rows are populated, the dismissal
    /// window has expired, and at least one row is still incomplete. An empty
    /// `setupProgress` (server omits it once everything is done) collapses
    /// the widget without an extra round-trip.
    public var isVisible: Bool {
        guard !rows.isEmpty else { return false }
        if let until = dismissedUntil, until > Date() { return false }
        return rows.contains(where: { !$0.isComplete })
    }

    private let session: AppSession
    private let userDefaults: UserDefaults
    private let dismissedUntilKey = "setupProgressDismissedUntil"

    public init(session: AppSession, userDefaults: UserDefaults = .standard) {
        self.session = session
        self.userDefaults = userDefaults
        self.refresh()
    }

    /// Re-project `session.setupProgress` onto `rows`. Callers should invoke
    /// this after refreshing `/api/mobile/me`.
    public func refresh() {
        guard let progress = session.setupProgress else {
            rows = []
            return
        }
        rows = [
            SetupProgressRow(
                id: "workspaceCreated",
                titleKey: "onboarding.setupProgress.workspace",
                isComplete: progress.workspaceCreated,
                deepLinkPath: nil
            ),
            SetupProgressRow(
                id: "demoImported",
                titleKey: "onboarding.setupProgress.demo",
                isComplete: progress.demoImported,
                deepLinkPath: nil
            ),
            SetupProgressRow(
                id: "invitesSent",
                titleKey: "onboarding.setupProgress.invites",
                isComplete: progress.invitesSent,
                deepLinkPath: "/admin/members/invite"
            ),
            SetupProgressRow(
                id: "firstCustomerAdded",
                titleKey: "onboarding.setupProgress.firstCustomer",
                isComplete: progress.firstCustomerAdded,
                deepLinkPath: "/cari/new"
            ),
            SetupProgressRow(
                id: "firstProductAdded",
                titleKey: "onboarding.setupProgress.firstProduct",
                isComplete: progress.firstProductAdded,
                deepLinkPath: "/prices/products/new"
            ),
            SetupProgressRow(
                id: "firstInvoicePosted",
                titleKey: "onboarding.setupProgress.firstInvoice",
                isComplete: progress.firstInvoicePosted,
                deepLinkPath: "/sales/invoice/new"
            ),
        ]
    }

    private var dismissedUntil: Date? {
        userDefaults.object(forKey: dismissedUntilKey) as? Date
    }

    /// Snooze the widget for one week. The `isVisible` getter consults this
    /// timestamp on every read.
    public func hideForOneWeek() {
        let oneWeekFromNow = Date().addingTimeInterval(7 * 24 * 60 * 60)
        userDefaults.set(oneWeekFromNow, forKey: dismissedUntilKey)
    }

    /// Clear the dismissal window so the widget can show again immediately.
    public func unhide() {
        userDefaults.removeObject(forKey: dismissedUntilKey)
    }
}
