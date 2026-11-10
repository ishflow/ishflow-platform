import Auth
import Foundation
import Observation

/// Drives the workspace-setup form. Owns input state, validates name length,
/// calls `OnboardingAPI.createTenant`, persists the returned JWT via
/// `AuthService.persist(token:)`, and advances the coordinator on success.
@Observable
@MainActor
public final class WorkspaceSetupViewModel {
    /// Why the most recent `submit()` attempt could not complete.
    public enum SubmitError: Sendable, Equatable {
        /// Server returned 409 — the user already owns a tenant. Defensive
        /// (`/api/mobile/onboarding/tenant` should not be reachable in that case).
        case alreadyOnboarded
        /// Catch-all for transport / decode / unknown server failures.
        case network
        /// Local validation rejected the input before the request fired.
        case validation(field: String)
    }

    public var name: String = ""
    public var currency: String
    public var locale: String
    public private(set) var inFlight: Bool = false
    public private(set) var error: SubmitError?

    private let api: OnboardingAPI
    private let auth: AuthService
    private let coordinator: OnboardingCoordinator

    public init(
        api: OnboardingAPI,
        auth: AuthService,
        coordinator: OnboardingCoordinator,
        deviceLocale: Locale = .current
    ) {
        self.api = api
        self.auth = auth
        self.coordinator = coordinator
        let resolvedLocale = CurrencySuggestion.supportedLocale(for: deviceLocale)
        self.locale = resolvedLocale
        self.currency = CurrencySuggestion.byLocale(resolvedLocale)
    }

    /// True when the form is idle and the trimmed name fits the 2–80 char window.
    public var canSubmit: Bool {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        return !inFlight && trimmed.count >= 2 && trimmed.count <= 80
    }

    /// Submits the form. On success persists the re-minted JWT and advances
    /// the coordinator from `.workspace` to `.demo`. On 409 sets
    /// `error = .alreadyOnboarded`; on anything else `error = .network`.
    public func submit() async {
        guard canSubmit else {
            error = .validation(field: "name")
            return
        }
        error = nil
        inFlight = true
        defer { inFlight = false }
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        do {
            let result = try await api.createTenant(
                name: trimmedName,
                currency: currency,
                locale: locale
            )
            try await auth.persist(token: result.jwt)
            coordinator.didCreateTenant(id: result.tenantId)
        } catch let apiError as OnboardingAPIError where apiError == .alreadyOnboarded {
            error = .alreadyOnboarded
        } catch {
            self.error = .network
        }
    }
}
