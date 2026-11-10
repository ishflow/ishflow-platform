import Auth
import Foundation
@testable import Onboarding
import XCTest

@MainActor
final class WorkspaceSetupViewModelTests: XCTestCase {

    // MARK: - Locale defaults

    func testDefaultCurrencyFromLocale_ru() {
        let vm = makeViewModel(locale: Locale(identifier: "ru"))
        XCTAssertEqual(vm.locale, "ru")
        XCTAssertEqual(vm.currency, "RUB")
    }

    func testDefaultCurrencyFromLocale_en() {
        let vm = makeViewModel(locale: Locale(identifier: "en"))
        XCTAssertEqual(vm.locale, "en")
        XCTAssertEqual(vm.currency, "USD")
    }

    func testDefaultCurrencyFromLocale_unsupported() {
        let vm = makeViewModel(locale: Locale(identifier: "ja"))
        XCTAssertEqual(vm.locale, "en")
        XCTAssertEqual(vm.currency, "USD")
    }

    // MARK: - canSubmit

    func testShortNameDisablesSubmit() {
        let vm = makeViewModel()
        vm.name = "A"
        XCTAssertFalse(vm.canSubmit)
    }

    func testValidNameEnablesSubmit() {
        let vm = makeViewModel()
        vm.name = "Acme"
        XCTAssertTrue(vm.canSubmit)
    }

    func testWhitespaceOnlyNameDisablesSubmit() {
        let vm = makeViewModel()
        vm.name = "   "
        XCTAssertFalse(vm.canSubmit)
    }

    func testInFlightDisablesSubmit() async {
        let api = FakeOnboardingAPI()
        api.delaySeconds = 0.5
        let auth = FakeAuthService()
        let coordinator = OnboardingCoordinator(
            auth: auth,
            api: api,
            initialPhase: .workspace
        )
        let vm = WorkspaceSetupViewModel(
            api: api,
            auth: auth,
            coordinator: coordinator,
            deviceLocale: Locale(identifier: "ru")
        )
        vm.name = "Acme"
        XCTAssertTrue(vm.canSubmit)
        let task = Task { await vm.submit() }
        // Give the submit task time to flip `inFlight` true before checking.
        try? await Task.sleep(nanoseconds: 100_000_000)
        XCTAssertTrue(vm.inFlight)
        XCTAssertFalse(vm.canSubmit)
        await task.value
        XCTAssertFalse(vm.inFlight)
    }

    // MARK: - submit()

    func testSuccessfulSubmitAdvancesCoordinator() async {
        let api = FakeOnboardingAPI()
        let auth = FakeAuthService()
        let coordinator = OnboardingCoordinator(
            auth: auth,
            api: api,
            initialPhase: .workspace
        )
        let vm = WorkspaceSetupViewModel(
            api: api,
            auth: auth,
            coordinator: coordinator,
            deviceLocale: Locale(identifier: "ru")
        )
        vm.name = "Acme"
        await vm.submit()

        XCTAssertNil(vm.error)
        XCTAssertEqual(coordinator.phase, .demo)
        XCTAssertEqual(auth.persistedToken, "jwt1")
        XCTAssertEqual(api.createTenantCallCount, 1)
        XCTAssertEqual(api.lastCreateTenantArgs?.name, "Acme")
        XCTAssertEqual(api.lastCreateTenantArgs?.currency, "RUB")
        XCTAssertEqual(api.lastCreateTenantArgs?.locale, "ru")
    }

    func testSubmitTrimsWhitespaceFromName() async {
        let api = FakeOnboardingAPI()
        let auth = FakeAuthService()
        let coordinator = OnboardingCoordinator(
            auth: auth,
            api: api,
            initialPhase: .workspace
        )
        let vm = WorkspaceSetupViewModel(
            api: api,
            auth: auth,
            coordinator: coordinator,
            deviceLocale: Locale(identifier: "ru")
        )
        vm.name = "  Acme  "
        await vm.submit()
        XCTAssertEqual(api.lastCreateTenantArgs?.name, "Acme")
    }

    func test409SurfacesAlreadyOnboardedError() async {
        let api = FakeOnboardingAPI()
        api.createTenantResult = .failure(OnboardingAPIError.alreadyOnboarded)
        let auth = FakeAuthService()
        let coordinator = OnboardingCoordinator(
            auth: auth,
            api: api,
            initialPhase: .workspace
        )
        let vm = WorkspaceSetupViewModel(
            api: api,
            auth: auth,
            coordinator: coordinator,
            deviceLocale: Locale(identifier: "en")
        )
        vm.name = "Acme"
        await vm.submit()

        XCTAssertEqual(vm.error, .alreadyOnboarded)
        XCTAssertEqual(coordinator.phase, .workspace)
        XCTAssertNil(auth.persistedToken)
    }

    func testGenericErrorSurfacesNetwork() async {
        let api = FakeOnboardingAPI()
        api.createTenantResult = .failure(TestError.boom)
        let auth = FakeAuthService()
        let coordinator = OnboardingCoordinator(
            auth: auth,
            api: api,
            initialPhase: .workspace
        )
        let vm = WorkspaceSetupViewModel(
            api: api,
            auth: auth,
            coordinator: coordinator,
            deviceLocale: Locale(identifier: "en")
        )
        vm.name = "Acme"
        await vm.submit()

        XCTAssertEqual(vm.error, .network)
        XCTAssertEqual(coordinator.phase, .workspace)
        XCTAssertNil(auth.persistedToken)
    }

    func testSubmitWithInvalidNameSurfacesValidationError() async {
        let api = FakeOnboardingAPI()
        let auth = FakeAuthService()
        let coordinator = OnboardingCoordinator(
            auth: auth,
            api: api,
            initialPhase: .workspace
        )
        let vm = WorkspaceSetupViewModel(
            api: api,
            auth: auth,
            coordinator: coordinator,
            deviceLocale: Locale(identifier: "en")
        )
        vm.name = "A"
        await vm.submit()

        XCTAssertEqual(vm.error, .validation(field: "name"))
        XCTAssertEqual(api.createTenantCallCount, 0)
        XCTAssertEqual(coordinator.phase, .workspace)
    }

    // MARK: - helpers

    private func makeViewModel(locale: Locale = Locale(identifier: "en")) -> WorkspaceSetupViewModel {
        let api = FakeOnboardingAPI()
        let auth = FakeAuthService()
        let coordinator = OnboardingCoordinator(
            auth: auth,
            api: api,
            initialPhase: .workspace
        )
        return WorkspaceSetupViewModel(
            api: api,
            auth: auth,
            coordinator: coordinator,
            deviceLocale: locale
        )
    }
}

private enum TestError: Error { case boom }

private final class FakeOnboardingAPI: OnboardingAPI, @unchecked Sendable {
    // All access is from the `@MainActor` view model, so unguarded properties
    // are safe under `@unchecked Sendable`.
    var createTenantResult: Result<CreateTenantResult, Error> = .success(
        CreateTenantResult(tenantId: "t1", jwt: "jwt1", trialEndsAt: .distantFuture)
    )
    var createTenantCallCount = 0
    var lastCreateTenantArgs: (name: String, currency: String, locale: String)?
    var delaySeconds: Double = 0

    func createTenant(name: String, currency: String, locale: String) async throws -> CreateTenantResult {
        createTenantCallCount += 1
        lastCreateTenantArgs = (name, currency, locale)
        if delaySeconds > 0 {
            try? await Task.sleep(nanoseconds: UInt64(delaySeconds * 1_000_000_000))
        }
        return try createTenantResult.get()
    }

    func seedDemo(tenantId: String) async throws {}

    func deleteAccount() async throws {}
}

private final class FakeAuthService: AuthService, @unchecked Sendable {
    // All mutation is funnelled through the `@MainActor` view model, so the
    // raw property is safe even with `@unchecked Sendable`.
    var persistedToken: String?

    func currentToken() async -> String? { persistedToken }
    func signIn() async throws -> String { "stub" }
    func signUp() async throws -> String { "stub" }
    func signOut() async throws { persistedToken = nil }
    func handleCallback(url: URL) async throws -> String { "stub" }
    func persist(token: String) async throws { persistedToken = token }
}
