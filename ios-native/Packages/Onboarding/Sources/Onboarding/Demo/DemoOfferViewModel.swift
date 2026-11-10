import Foundation
import Observation

/// Drives the optional "import 5 customers / 12 products / 3 invoices" demo
/// step. Reads `pendingTenantId` off the coordinator (written during the
/// preceding `.workspace` step), calls `OnboardingAPI.seedDemo`, and advances
/// the coordinator from `.demo` to `.done` whether the user imports, skips,
/// or hits an error and chooses to continue anyway.
@Observable
@MainActor
public final class DemoOfferViewModel {
    /// Why the most recent `importDemo()` attempt could not complete.
    public enum DemoError: Sendable, Equatable {
        /// The seed-demo HTTP call threw. The user can still continue to the
        /// app — failure here is never fatal.
        case importFailed
    }

    public private(set) var inFlight: Bool = false
    public private(set) var error: DemoError?

    private let api: OnboardingAPI
    private let coordinator: OnboardingCoordinator

    public init(api: OnboardingAPI, coordinator: OnboardingCoordinator) {
        self.api = api
        self.coordinator = coordinator
    }

    /// Attempts to seed demo data into the freshly-created tenant. On success
    /// advances the coordinator. On failure surfaces `.importFailed` and lets
    /// the view offer a "continue anyway" affordance — failure must not block
    /// app entry.
    public func importDemo() async {
        error = nil
        inFlight = true
        defer { inFlight = false }
        guard let tenantId = coordinator.pendingTenantId else {
            // Defensive: no tenant context means we cannot seed. Skip rather
            // than trap the user.
            coordinator.advance()
            return
        }
        do {
            try await api.seedDemo(tenantId: tenantId)
            coordinator.advance()
        } catch {
            self.error = .importFailed
        }
    }

    /// User declined the demo-data offer. Clears any prior error and advances.
    public func skip() {
        error = nil
        coordinator.advance()
    }

    /// User hit an import error and chose to enter the app anyway. Clears the
    /// error and advances.
    public func continueAnyway() {
        error = nil
        coordinator.advance()
    }
}
