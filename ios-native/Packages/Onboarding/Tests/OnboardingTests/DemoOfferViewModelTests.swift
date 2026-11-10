import Auth
import Foundation
@testable import Onboarding
import XCTest

@MainActor
final class DemoOfferViewModelTests: XCTestCase {

    // MARK: - Happy paths

    func testImportSuccessAdvancesCoordinator() async {
        let api = FakeOnboardingAPI()
        let coordinator = makeCoordinator(api: api)
        coordinator.didCreateTenant(id: "t1")
        XCTAssertEqual(coordinator.phase, .demo)

        let vm = DemoOfferViewModel(api: api, coordinator: coordinator)
        await vm.importDemo()

        XCTAssertNil(vm.error)
        XCTAssertEqual(coordinator.phase, .done)
        XCTAssertEqual(api.seedDemoCallCount, 1)
        XCTAssertEqual(api.lastSeedDemoTenantId, "t1")
    }

    func testSkipAdvancesCoordinator() async {
        let api = FakeOnboardingAPI()
        let coordinator = makeCoordinator(api: api)
        coordinator.didCreateTenant(id: "t1")

        let vm = DemoOfferViewModel(api: api, coordinator: coordinator)
        vm.skip()

        XCTAssertNil(vm.error)
        XCTAssertEqual(coordinator.phase, .done)
        XCTAssertEqual(api.seedDemoCallCount, 0)
    }

    // MARK: - Failure paths

    func testImportFailureKeepsCoordinatorAtDemo() async {
        let api = FakeOnboardingAPI()
        api.seedDemoResult = .failure(TestError.boom)
        let coordinator = makeCoordinator(api: api)
        coordinator.didCreateTenant(id: "t1")

        let vm = DemoOfferViewModel(api: api, coordinator: coordinator)
        await vm.importDemo()

        XCTAssertEqual(vm.error, .importFailed)
        XCTAssertEqual(coordinator.phase, .demo)
        XCTAssertEqual(api.seedDemoCallCount, 1)
    }

    func testImportFailureThenContinueAnywayAdvances() async {
        let api = FakeOnboardingAPI()
        api.seedDemoResult = .failure(TestError.boom)
        let coordinator = makeCoordinator(api: api)
        coordinator.didCreateTenant(id: "t1")

        let vm = DemoOfferViewModel(api: api, coordinator: coordinator)
        await vm.importDemo()
        XCTAssertEqual(vm.error, .importFailed)
        XCTAssertEqual(coordinator.phase, .demo)

        vm.continueAnyway()

        XCTAssertNil(vm.error)
        XCTAssertEqual(coordinator.phase, .done)
    }

    // MARK: - Defensive

    func testNoTenantIdAdvances() async {
        let api = FakeOnboardingAPI()
        let auth = FakeAuthService()
        // Park the coordinator directly at `.demo` without going through
        // `didCreateTenant`, so `pendingTenantId` stays nil. This is the
        // defensive case — `importDemo` should skip the API call and
        // advance.
        let coordinator = OnboardingCoordinator(
            auth: auth,
            api: api,
            initialPhase: .demo
        )
        XCTAssertNil(coordinator.pendingTenantId)

        let vm = DemoOfferViewModel(api: api, coordinator: coordinator)
        await vm.importDemo()

        XCTAssertNil(vm.error)
        XCTAssertEqual(coordinator.phase, .done)
        XCTAssertEqual(api.seedDemoCallCount, 0)
    }

    // MARK: - In-flight

    func testInFlightDuringImport() async {
        let api = FakeOnboardingAPI()
        api.delaySeconds = 0.3
        let coordinator = makeCoordinator(api: api)
        coordinator.didCreateTenant(id: "t1")

        let vm = DemoOfferViewModel(api: api, coordinator: coordinator)
        XCTAssertFalse(vm.inFlight)

        let task = Task { await vm.importDemo() }
        try? await Task.sleep(nanoseconds: 100_000_000)
        XCTAssertTrue(vm.inFlight)

        await task.value
        XCTAssertFalse(vm.inFlight)
        XCTAssertEqual(coordinator.phase, .done)
    }

    // MARK: - helpers

    /// Build a coordinator parked at `.workspace`. Callers either advance it
    /// to `.demo` via `coordinator.didCreateTenant(id:)` (which also writes
    /// `pendingTenantId`) or step it manually via `advance()` for the
    /// no-tenant-id defensive case.
    private func makeCoordinator(api: OnboardingAPI) -> OnboardingCoordinator {
        let auth = FakeAuthService()
        return OnboardingCoordinator(
            auth: auth,
            api: api,
            initialPhase: .workspace
        )
    }
}

private enum TestError: Error { case boom }

private final class FakeOnboardingAPI: OnboardingAPI, @unchecked Sendable {
    // All access is from the `@MainActor` view model, so unguarded properties
    // are safe under `@unchecked Sendable`.
    var seedDemoResult: Result<Void, Error> = .success(())
    var seedDemoCallCount = 0
    var lastSeedDemoTenantId: String?
    var delaySeconds: Double = 0

    func createTenant(name: String, currency: String, locale: String) async throws -> CreateTenantResult {
        CreateTenantResult(tenantId: "t1", jwt: "jwt1", trialEndsAt: .distantFuture)
    }

    func seedDemo(tenantId: String) async throws {
        seedDemoCallCount += 1
        lastSeedDemoTenantId = tenantId
        if delaySeconds > 0 {
            try? await Task.sleep(nanoseconds: UInt64(delaySeconds * 1_000_000_000))
        }
        try seedDemoResult.get()
    }

    func deleteAccount() async throws {}
}

private final class FakeAuthService: AuthService, @unchecked Sendable {
    var persistedToken: String?

    func currentToken() async -> String? { persistedToken }
    func signIn() async throws -> String { "stub" }
    func signUp() async throws -> String { "stub" }
    func signOut() async throws { persistedToken = nil }
    func handleCallback(url: URL) async throws -> String { "stub" }
    func persist(token: String) async throws { persistedToken = token }
}
