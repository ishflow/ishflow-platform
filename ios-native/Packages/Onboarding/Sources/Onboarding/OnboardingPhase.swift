import Foundation

/// Discrete steps the user moves through during first-run onboarding. The
/// coordinator owns transitions; views observe `OnboardingCoordinator.phase`
/// and render the matching screen.
public enum OnboardingPhase: Sendable, Equatable {
    case welcome
    case signIn
    case workspace
    case demo
    case done
}
