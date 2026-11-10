import Auth
import Foundation
@testable import Onboarding
import XCTest

@MainActor
final class OnboardingCoordinatorTests: XCTestCase {
    private var defaults: UserDefaults!
    private let suiteName = "OnboardingCoordinatorTests"

    override func setUp() async throws {
        try await super.setUp()
        defaults = UserDefaults(suiteName: suiteName)
        defaults.removePersistentDomain(forName: suiteName)
    }

    override func tearDown() async throws {
        defaults.removePersistentDomain(forName: suiteName)
        defaults = nil
        try await super.tearDown()
    }

    // MARK: - start(from:)

    func testStartNoTokenUnseenWelcomeRoutesToWelcome() {
        defaults.set(false, forKey: onboardingHasSeenWelcomeKey)
        let sut = makeCoordinator(initial: .done)
        sut.start(from: .noToken)
        XCTAssertEqual(sut.phase, .welcome)
    }

    func testStartNoTokenSeenWelcomeSkipsToSignIn() {
        defaults.set(true, forKey: onboardingHasSeenWelcomeKey)
        let sut = makeCoordinator(initial: .done)
        sut.start(from: .noToken)
        XCTAssertEqual(sut.phase, .signIn)
    }

    func testStartTokenButNoMembershipsRoutesToWorkspace() {
        let sut = makeCoordinator(initial: .welcome)
        sut.start(from: .tokenButNoMemberships)
        XCTAssertEqual(sut.phase, .workspace)
    }

    func testStartTokenAndMultipleTenantsRoutesToDone() {
        let sut = makeCoordinator(initial: .welcome)
        sut.start(from: .tokenAndMultipleTenants)
        XCTAssertEqual(sut.phase, .done)
    }

    func testStartTokenAndActiveTenantRoutesToDone() {
        let sut = makeCoordinator(initial: .welcome)
        sut.start(from: .tokenAndActiveTenant)
        XCTAssertEqual(sut.phase, .done)
    }

    // MARK: - advance()

    func testAdvanceWelcomeToSignIn() {
        let sut = makeCoordinator(initial: .welcome)
        sut.advance()
        XCTAssertEqual(sut.phase, .signIn)
    }

    func testAdvanceSignInToWorkspace() {
        let sut = makeCoordinator(initial: .signIn)
        sut.advance()
        XCTAssertEqual(sut.phase, .workspace)
    }

    func testAdvanceWorkspaceToDemo() {
        let sut = makeCoordinator(initial: .workspace)
        sut.advance()
        XCTAssertEqual(sut.phase, .demo)
    }

    func testAdvanceDemoToDone() {
        let sut = makeCoordinator(initial: .demo)
        sut.advance()
        XCTAssertEqual(sut.phase, .done)
    }

    func testAdvanceDoneIsTerminal() {
        let sut = makeCoordinator(initial: .done)
        sut.advance()
        XCTAssertEqual(sut.phase, .done)
    }

    // MARK: - goBack()

    func testGoBackWelcomeIsTerminal() {
        let sut = makeCoordinator(initial: .welcome)
        sut.goBack()
        XCTAssertEqual(sut.phase, .welcome)
    }

    func testGoBackSignInWithoutSeenWelcomeReturnsToWelcome() {
        defaults.set(false, forKey: onboardingHasSeenWelcomeKey)
        let sut = makeCoordinator(initial: .signIn)
        sut.goBack()
        XCTAssertEqual(sut.phase, .welcome)
    }

    func testGoBackSignInWithSeenWelcomeStaysOnSignIn() {
        defaults.set(true, forKey: onboardingHasSeenWelcomeKey)
        let sut = makeCoordinator(initial: .signIn)
        sut.goBack()
        XCTAssertEqual(sut.phase, .signIn)
    }

    func testGoBackWorkspaceToSignIn() {
        let sut = makeCoordinator(initial: .workspace)
        sut.goBack()
        XCTAssertEqual(sut.phase, .signIn)
    }

    func testGoBackDemoToWorkspace() {
        let sut = makeCoordinator(initial: .demo)
        sut.goBack()
        XCTAssertEqual(sut.phase, .workspace)
    }

    func testGoBackDoneToDemo() {
        let sut = makeCoordinator(initial: .done)
        sut.goBack()
        XCTAssertEqual(sut.phase, .demo)
    }

    // MARK: - helpers

    private func makeCoordinator(initial: OnboardingPhase) -> OnboardingCoordinator {
        OnboardingCoordinator(
            auth: FakeAuthService(),
            api: FakeOnboardingAPI(),
            initialPhase: initial,
            defaults: defaults
        )
    }
}

private final class FakeAuthService: AuthService, @unchecked Sendable {
    func currentToken() async -> String? { nil }
    func signIn() async throws -> String { "" }
    func signUp() async throws -> String { "" }
    func signOut() async throws {}
    func handleCallback(url: URL) async throws -> String { "" }
    func persist(token: String) async throws {}
}

private final class FakeOnboardingAPI: OnboardingAPI, @unchecked Sendable {
    func createTenant(name: String, currency: String, locale: String) async throws -> CreateTenantResult {
        CreateTenantResult(tenantId: "t_fake", jwt: "jwt_fake", trialEndsAt: .distantFuture)
    }

    func seedDemo(tenantId: String) async throws {}

    func deleteAccount() async throws {}
}
