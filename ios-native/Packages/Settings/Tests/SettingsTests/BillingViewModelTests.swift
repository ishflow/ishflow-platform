import APIClient
import AppShared
import Foundation
@testable import Settings
import XCTest

@MainActor
final class BillingViewModelTests: XCTestCase {
    // MARK: - load

    func testLoadHappyPath() async {
        let snapshot = makeSnapshot(plan: .pro, trialEndsAt: nil)
        let api = MockAPIClient(responses: [.billing(snapshot)])
        let viewModel = BillingViewModel(api: api)

        await viewModel.load()

        guard case let .ready(value) = viewModel.state else {
            XCTFail("expected .ready, got \(viewModel.state)")
            return
        }
        XCTAssertEqual(value, snapshot)
        let calls = await api.callCount
        XCTAssertEqual(calls, 1)
    }

    func testLoadFailureSetsFailedState() async {
        let api = MockAPIClient(responses: [.error(URLError(.badServerResponse))])
        let viewModel = BillingViewModel(api: api)

        await viewModel.load()

        guard case .failed = viewModel.state else {
            XCTFail("expected .failed, got \(viewModel.state)")
            return
        }
    }

    // MARK: - trialDaysLeft

    func testTrialDaysLeftWithFutureExpiry() async {
        let twoDays: TimeInterval = 2 * 86_400
        let snapshot = makeSnapshot(
            plan: .starter,
            trialEndsAt: Date().addingTimeInterval(twoDays)
        )
        let api = MockAPIClient(responses: [.billing(snapshot)])
        let viewModel = BillingViewModel(api: api)

        await viewModel.load()

        XCTAssertEqual(viewModel.trialDaysLeft, 2)
    }

    func testTrialDaysLeftWithoutTrial() async {
        let snapshot = makeSnapshot(plan: .pro, trialEndsAt: nil)
        let api = MockAPIClient(responses: [.billing(snapshot)])
        let viewModel = BillingViewModel(api: api)

        await viewModel.load()

        XCTAssertNil(viewModel.trialDaysLeft)
    }

    func testTrialDaysLeftReturnsNilBeforeLoad() {
        let api = MockAPIClient(responses: [])
        let viewModel = BillingViewModel(api: api)

        XCTAssertNil(viewModel.trialDaysLeft)
    }

    // MARK: - openManageOnWeb

    func testOpenManageOnWebReturnsURL() async {
        let snapshot = makeSnapshot(plan: .pro, trialEndsAt: nil)
        let handoffURL = URL(string: "https://example.com/portal?token=abc")!
        let api = MockAPIClient(responses: [
            .billing(snapshot),
            .handoff(BillingHandoffResponse(
                url: handoffURL,
                expiresAt: Date().addingTimeInterval(300)
            ))
        ])
        let viewModel = BillingViewModel(api: api)
        await viewModel.load()

        let url = await viewModel.openManageOnWeb()

        XCTAssertEqual(url, handoffURL)
        // Flag is reset after the call completes.
        XCTAssertFalse(viewModel.openingHandoff)
    }

    func testOpenManageOnWebReturnsNilBeforeLoad() async {
        let api = MockAPIClient(responses: [])
        let viewModel = BillingViewModel(api: api)

        let url = await viewModel.openManageOnWeb()

        XCTAssertNil(url)
        let calls = await api.callCount
        XCTAssertEqual(calls, 0)
    }

    // MARK: - BillingFormat

    func testUnlimitedSentinelDetected() {
        XCTAssertTrue(BillingFormat.isUnlimited(9_007_199_254_740_991))
        XCTAssertFalse(BillingFormat.isUnlimited(50))
        // 107 GB expressed in bytes must NOT read as unlimited.
        XCTAssertFalse(BillingFormat.isUnlimited(115_292_150_460))
    }

    func testZeroBytesRendersAsZeroKB() {
        XCTAssertEqual(BillingFormat.byteCount(0), "0 KB")
    }

    // MARK: - Helpers

    private func makeSnapshot(
        plan: BillingResponse.Plan,
        trialEndsAt: Date?
    ) -> BillingResponse {
        BillingResponse(
            plan: plan,
            status: trialEndsAt == nil ? .active : .trialing,
            trialEndsAt: trialEndsAt,
            stripeCustomerId: "cus_test",
            stripeSubscriptionId: "sub_test",
            currency: "USD",
            limits: PlanLimits(
                members: 10,
                monthlyPostedDocs: 1_000,
                storageBytes: 10 * 1024 * 1024 * 1024,
                savedViews: 50
            ),
            usage: UsageSnapshot(
                members: 3,
                monthlyPostedDocs: 120,
                storageBytes: 256 * 1024 * 1024,
                savedViews: 4
            )
        )
    }
}

/// Test double for `APIClient` that returns a queued sequence of pre-canned
/// responses. Implemented as an `actor` so the protocol's `Sendable`
/// requirement is satisfied without `@unchecked Sendable`.
private actor MockAPIClient: APIClient {
    enum Response {
        case billing(BillingResponse)
        case handoff(BillingHandoffResponse)
        case error(Error)
    }

    private var queue: [Response]
    private(set) var callCount = 0

    init(responses: [Response]) {
        queue = responses
    }

    func send<R: APIRequest>(_: R) async throws -> R.Response {
        callCount += 1
        guard !queue.isEmpty else {
            throw URLError(.unknown)
        }
        let next = queue.removeFirst()
        switch next {
        case let .billing(value):
            guard let typed = value as? R.Response else {
                throw URLError(.cannotDecodeContentData)
            }
            return typed
        case let .handoff(value):
            guard let typed = value as? R.Response else {
                throw URLError(.cannotDecodeContentData)
            }
            return typed
        case let .error(err):
            throw err
        }
    }
}
