import Auth
import Foundation
import Observation

/// High-level session classification the coordinator maps onto an
/// `OnboardingPhase`. Driven by what the app shell can already infer from the
/// keychain JWT and `/api/mobile/me` payload at launch.
public enum OnboardingSessionState: Sendable, Equatable {
    case noToken
    case tokenButNoMemberships
    case tokenAndMultipleTenants
    case tokenAndActiveTenant
}

/// UserDefaults key tracking whether the user has dismissed the welcome screen
/// at least once. Mirrors the `@AppStorage("hasSeenWelcome")` flag the views
/// will bind to in later tasks.
public let onboardingHasSeenWelcomeKey = "hasSeenWelcome"

/// Drives the onboarding state machine. Owns the current `phase`, exposes
/// classification entry (`start(from:)`), and forward/backward stepping
/// helpers. `@MainActor` to keep observation reads off the concurrent boundary.
@MainActor
@Observable
public final class OnboardingCoordinator {
    public private(set) var phase: OnboardingPhase
    /// Tenant id of the tenant the user just created in the `.workspace`
    /// step. Stays nil until `didCreateTenant(id:)` fires. Consumed by
    /// `DemoOfferViewModel` to pass to `OnboardingAPI.seedDemo`.
    public private(set) var pendingTenantId: String?

    private let auth: AuthService
    private let api: OnboardingAPI
    private let defaults: UserDefaults

    public init(
        auth: AuthService,
        api: OnboardingAPI,
        initialPhase: OnboardingPhase = .welcome,
        defaults: UserDefaults = .standard
    ) {
        self.auth = auth
        self.api = api
        self.phase = initialPhase
        self.defaults = defaults
        self.pendingTenantId = nil
    }

    /// Classify the launch-time session into a starting phase. Mirrors the
    /// `.loading → …` branches in spec §State Machine.
    public func start(from state: OnboardingSessionState) {
        switch state {
        case .noToken:
            phase = hasSeenWelcome ? .signIn : .welcome
        case .tokenButNoMemberships:
            phase = .workspace
        case .tokenAndMultipleTenants, .tokenAndActiveTenant:
            phase = .done
        }
    }

    /// Record the freshly-created tenant id and step forward. Called by
    /// `WorkspaceSetupViewModel.submit()` on a successful tenant create so
    /// the subsequent `.demo` step can seed against that exact tenant.
    public func didCreateTenant(id: String) {
        pendingTenantId = id
        advance()
    }

    /// Step forward through the natural onboarding order:
    /// welcome → signIn → workspace → demo → done. `.done` is terminal.
    public func advance() {
        switch phase {
        case .welcome: phase = .signIn
        case .signIn: phase = .workspace
        case .workspace: phase = .demo
        case .demo: phase = .done
        case .done: break
        }
    }

    /// Step backward through the flow. Going back from `.signIn` lands on
    /// `.welcome` only if the user has not yet flagged the welcome screen as
    /// seen; otherwise it stays on `.signIn` (no reason to re-show welcome).
    /// `.welcome` is terminal in the reverse direction.
    public func goBack() {
        switch phase {
        case .welcome: break
        case .signIn: phase = hasSeenWelcome ? .signIn : .welcome
        case .workspace: phase = .signIn
        case .demo: phase = .workspace
        case .done: phase = .demo
        }
    }

    private var hasSeenWelcome: Bool {
        defaults.bool(forKey: onboardingHasSeenWelcomeKey)
    }
}
