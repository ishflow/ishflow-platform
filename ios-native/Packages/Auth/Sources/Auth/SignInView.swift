import AppShared
import SwiftUI
#if canImport(AuthenticationServices)
import AuthenticationServices
#endif

/// Onboarding sign-in / sign-up screen (Aurora reskin). Renders over an animated
/// aurora background with a bottom-anchored frosted-glass card. The CTA hierarchy
/// leads with account creation:
///   1. "Create account" (primary) — falls back to "Sign in" as primary when no
///      sign-up action is injected.
///   2. "Sign in with Apple" (when enabled).
///   3. "Already have an account? Sign in" text link.
///   4. "Preview without sign-in" peek link (when a skip action is injected).
///   5. Terms / Privacy legal footnote.
/// All injected actions, error handling and accessibility identifiers are
/// preserved from the prior implementation — this is a view-layer reskin only.
public struct SignInView: View {
    private let signInAction: @MainActor () async throws -> Void
    private let signUpAction: (@MainActor () async throws -> Void)?
    private let skipAction: (@MainActor () -> Void)?
    private let signInWithAppleAction: (@MainActor () async throws -> Void)?
    private let appleSignInEnabled: Bool
    @State private var errorKey: LocalizedStringKey?
    @State private var inFlight = false

    /// Creates the view with an injected sign-in action so the view stays decoupled from the
    /// concrete `AuthService` implementation.
    public init(
        signInAction: @MainActor @escaping () async throws -> Void,
        signUpAction: (@MainActor () async throws -> Void)? = nil,
        skipAction: (@MainActor () -> Void)? = nil,
        signInWithAppleAction: (@MainActor () async throws -> Void)? = nil,
        appleSignInEnabled: Bool = false
    ) {
        self.signInAction = signInAction
        self.signUpAction = signUpAction
        self.skipAction = skipAction
        self.signInWithAppleAction = signInWithAppleAction
        self.appleSignInEnabled = appleSignInEnabled
    }

    /// View body.
    public var body: some View {
        ZStack {
            AuroraBackground()

            VStack(spacing: 0) {
                Spacer()

                GlassMark(systemImage: "lock.shield")
                    .padding(.bottom, 18)

                GlassCard {
                    VStack(alignment: .leading, spacing: 0) {
                        Text("auth.aurora.headline")
                            .font(.system(size: 31, weight: .heavy))
                            .tracking(-0.6)
                            .foregroundStyle(Color.primary)
                            .fixedSize(horizontal: false, vertical: true)

                        Text("auth.aurora.subtitle")
                            .font(.system(size: 15.5))
                            .foregroundStyle(Color.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                            .padding(.top, 10)

                        primaryCTA
                            .padding(.top, 20)

                        appleButton

                        signInLinkRow

                        peekRow

                        legalFootnote

                        if let errorKey {
                            Text(errorKey)
                                .font(.caption)
                                .foregroundStyle(.red)
                                .frame(maxWidth: .infinity)
                                .padding(.top, 10)
                                .accessibilityIdentifier("auth.error")
                        }
                    }
                }
            }
            .padding(.horizontal, 22)
            .padding(.bottom, 28)
        }
    }

    /// Primary filled CTA. Leads with account creation; if no sign-up action was
    /// injected, "Sign in" becomes the primary action instead.
    @ViewBuilder
    private var primaryCTA: some View {
        if signUpAction != nil {
            Button(action: signUp) {
                ctaLabel("auth.signUp")
            }
            .buttonStyle(AuroraPrimaryButtonStyle())
            .disabled(inFlight)
            .accessibilityIdentifier("auth.signUp")
        } else {
            Button(action: signIn) {
                ctaLabel("auth.signIn")
            }
            .buttonStyle(AuroraPrimaryButtonStyle())
            .disabled(inFlight)
            .accessibilityIdentifier("auth.signIn")
        }
    }

    @ViewBuilder
    private var appleButton: some View {
        #if canImport(AuthenticationServices)
        if appleSignInEnabled, let signInWithAppleAction {
            SignInWithAppleButton(.signIn) { request in
                request.requestedScopes = [.fullName, .email]
            } onCompletion: { result in
                // The credential is intentionally discarded — Clerk's hosted flow handles
                // server-side authentication. The button tap is only a UI hook that
                // delegates to `signInWithAppleAction` on user-confirmed success.
                if case .success = result {
                    signInWithApple(action: signInWithAppleAction)
                } else if case let .failure(error) = result {
                    errorKey = appleSignInErrorKey(for: error)
                }
            }
            .signInWithAppleButtonStyle(.black)
            .frame(maxWidth: .infinity, minHeight: 53)
            .clipShape(Capsule(style: .continuous))
            .padding(.top, 10)
            .disabled(inFlight)
            .accessibilityIdentifier("auth.signInWithApple")
        }
        #endif
    }

    /// "Already have an account? Sign in" link. Hidden when sign-in is already the
    /// primary CTA (no sign-up action), to avoid a duplicate sign-in affordance.
    @ViewBuilder
    private var signInLinkRow: some View {
        if signUpAction != nil {
            Button(action: signIn) {
                (Text("auth.aurora.haveAccount") + Text(" ") + Text("auth.signIn").bold())
                    .font(.system(size: 14.5))
                    .foregroundStyle(Color.secondary)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.plain)
            .disabled(inFlight)
            .padding(.top, 16)
            .accessibilityIdentifier("auth.signIn")
        }
    }

    @ViewBuilder
    private var peekRow: some View {
        if let skipAction {
            Button(action: skipAction) {
                Text("auth.peek")
                    .font(.system(size: 14))
                    .foregroundStyle(Color.secondary.opacity(0.85))
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.plain)
            .padding(.top, 12)
            .accessibilityIdentifier("auth.skip")
        }
    }

    private var legalFootnote: some View {
        (
            Text("auth.aurora.legalPrefix")
                + Text(" ")
                + linkText("legal.terms", url: "https://ishflow.com/terms")
                + Text(" ")
                + Text("auth.aurora.legalAnd")
                + Text(" ")
                + linkText("legal.privacy", url: "https://ishflow.com/privacy")
        )
        .font(.system(size: 11.5))
        .foregroundStyle(Color.secondary.opacity(0.7))
        .multilineTextAlignment(.center)
        .frame(maxWidth: .infinity)
        .padding(.top, 15)
    }

    private func linkText(_ key: LocalizedStringKey, url: String) -> Text {
        Text("[\(Text(key))](\(url))")
    }

    private func ctaLabel(_ key: LocalizedStringKey) -> some View {
        HStack(spacing: 8) {
            Text(key)
            Image(systemName: "arrow.right")
                .font(.system(size: 16, weight: .semibold))
        }
    }

    private func signIn() {
        Task {
            errorKey = nil
            inFlight = true
            defer { inFlight = false }
            do {
                try await signInAction()
            } catch let authError as AuthError {
                errorKey = localizedAuthErrorKey(for: authError)
            } catch is CancellationError {
                errorKey = "auth.error.cancelled"
            } catch {
                errorKey = "auth.error.providerGeneric"
            }
        }
    }

    private func signUp() {
        Task {
            errorKey = nil
            inFlight = true
            defer { inFlight = false }
            do {
                try await signUpAction?()
            } catch let authError as AuthError {
                errorKey = localizedAuthErrorKey(for: authError)
            } catch is CancellationError {
                errorKey = "auth.error.cancelled"
            } catch {
                errorKey = "auth.error.providerGeneric"
            }
        }
    }

    private func signInWithApple(action: @MainActor @escaping () async throws -> Void) {
        Task {
            errorKey = nil
            inFlight = true
            defer { inFlight = false }
            do {
                try await action()
            } catch let authError as AuthError {
                errorKey = localizedAuthErrorKey(for: authError)
            } catch is CancellationError {
                errorKey = "auth.error.cancelled"
            } catch {
                errorKey = "auth.error.providerGeneric"
            }
        }
    }
}

/// Map `AuthError` to a static `LocalizedStringKey` so SwiftUI resolves
/// "auth.error.cancelled" etc. against `Localizable.xcstrings`. Built via
/// interpolation, the key would contain a `%@` placeholder and the lookup
/// would miss, surfacing the raw key on screen.
func localizedAuthErrorKey(for error: AuthError) -> LocalizedStringKey {
    switch error {
    case .userCancelled: "auth.error.cancelled"
    case .missingTokenInCallback: "auth.error.missingToken"
    case .invalidCallbackURL: "auth.error.invalidCallback"
    case let .providerError(code):
        code == "access_denied" ? "auth.error.providerDenied" : "auth.error.providerGeneric"
    }
}

#if canImport(AuthenticationServices)
/// Translate `ASAuthorizationError` codes coming back from `SignInWithAppleButton.onCompletion`
/// into the same localized key namespace as the Clerk flow so the UI stays consistent.
func appleSignInErrorKey(for error: Error) -> LocalizedStringKey {
    if let asError = error as? ASAuthorizationError {
        switch asError.code {
        case .canceled: return "auth.error.cancelled"
        default: return "auth.error.providerGeneric"
        }
    }
    return "auth.error.providerGeneric"
}
#endif
