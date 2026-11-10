import APIClient
import AppShared
import Auth
import Onboarding
import Settings
import SwiftUI
import UIKit

/// Inline `/me` request used by the bootstrap flow. Kept private to AppRoot so
/// the rest of the app does not accidentally call it without going through the
/// session machinery here.
private struct GetMe: APIRequest {
    typealias Response = MeResponse
    let path = "/api/mobile/me"
    let method: HTTPMethod = .get
}

private struct SetActiveTenantRequest: APIRequest {
    typealias Response = SetActiveTenantResponse
    let path = "/api/mobile/tenants/active"
    let method: HTTPMethod = .post
    let body: (any Encodable & Sendable)?
}

private struct SetActiveTenantBody: Encodable {
    let tenantId: String
}

private struct SwitchTenantByIdRequest: APIRequest {
    typealias Response = SetActiveTenantResponse
    let tenantId: String
    var path: String { "/api/mobile/tenants/\(tenantId)/switch" }
    let method: HTTPMethod = .post
}

/// Root view that gates the app on auth + tenant state. Drives a multi-phase
/// state machine:
/// - `.loading` — reading keychain / hitting `/me`
/// - `.welcome` — first-run intro carousel (no token + !hasSeenWelcome)
/// - `.signIn` — no token; show `SignInView`
/// - `.workspaceSetup` — token but zero memberships; run onboarding form
/// - `.demoOffer` — workspace created; offer seed-demo import
/// - `.orgPick(tenants)` — token present but no active tenant
/// - `.main` — token + tenant; show `MainTabView`
struct AppRoot: View {
    @AppStorage("appLocale") private var localeCode: String = "ru"
    @AppStorage("appTheme") private var themeRaw: String = AppTheme.system.rawValue
    @AppStorage("hasSeenLanguagePicker") private var hasSeenLanguagePicker: Bool = false
    @AppStorage("hasSeenWelcome") private var hasSeenWelcome: Bool = false
    @State var container: AppContainer
    @Binding var pendingDeepLink: URL?
    @State private var phase: Phase = .loading
    @State private var session = AppSession()
    @State private var showLanguageSheet: Bool = false
    @State private var onboardingCoordinator: OnboardingCoordinator?
    @State private var onboardingAPI: URLSessionOnboardingAPI?

    init(container: AppContainer, pendingDeepLink: Binding<URL?>) {
        _container = State(initialValue: container)
        _pendingDeepLink = pendingDeepLink
    }

    /// Lifecycle phases driven by `bootstrap()`.
    enum Phase: Equatable {
        case loading
        case welcome
        case signIn
        case workspaceSetup
        case demoOffer
        case orgPick([TenantSummary])
        case main
    }

    var body: some View {
        Group {
            switch phase {
            case .loading:
                ProgressView()
            case .welcome:
                WelcomeView(onContinue: {
                    phase = .signIn
                })
            case .signIn:
                SignInView(
                    signInAction: { try await signInFlow() },
                    signUpAction: { try await signUpFlow() },
                    skipAction: { Task { await skipToDemoMode() } }
                )
            case .workspaceSetup:
                if let coordinator = onboardingCoordinator, let api = onboardingAPI {
                    WorkspaceSetupView(viewModel: WorkspaceSetupViewModel(
                        api: api,
                        auth: container.auth,
                        coordinator: coordinator
                    ))
                    .onChange(of: coordinator.phase) { _, newPhase in
                        if newPhase == .demo {
                            phase = .demoOffer
                        }
                    }
                } else {
                    ProgressView()
                }
            case .demoOffer:
                if let coordinator = onboardingCoordinator, let api = onboardingAPI {
                    DemoOfferView(viewModel: DemoOfferViewModel(
                        api: api,
                        coordinator: coordinator
                    ))
                    .onChange(of: coordinator.phase) { _, newPhase in
                        if newPhase == .done {
                            Task { await bootstrap() }
                        }
                    }
                } else {
                    ProgressView()
                }
            case let .orgPick(tenants):
                OrgPickerView(tenants: tenants) { picked in
                    session.tenant = picked
                    Task {
                        await container.featureFlags.update(picked.mobileFeatures)
                    }
                    phase = .main
                }
            case .main:
                MainTabView(
                    pendingDeepLink: $pendingDeepLink,
                    onSignOut: { Task { await signOut() } },
                    onSwitchTenant: switchTenant
                )
                // Binding the tab subtree to the active tenant id forces a
                // full re-init of every screen (dashboard, docs, cari, stock)
                // when the user switches organizations. View models re-fetch
                // automatically because their `.task` modifiers run again,
                // which removes the stale-data flicker that required a
                // manual pull-to-refresh after a tenant switch.
                .id(session.tenant?.id)
                .environment(session)
                .environment(container)
                .environment(\.tenantSwitch, { @Sendable id in
                    await switchTenant(id)
                })
            }
        }
        .task { await bootstrap() }
        .onReceive(NotificationCenter.default.publisher(for: UIApplication.willEnterForegroundNotification)) { _ in
            if phase == .main {
                Task { await bootstrap() }
            }
        }
        .onOpenURL { url in
            // Invite-origin sign-in arrives here as ishflow://auth/callback?token=
            // (the user never started an in-app ASWebAuthenticationSession), so we
            // must still accept it — but handleCallback now strictly validates the
            // host+path (G-iOS1 partial hardening). The COMPLETE session-fixation
            // fix (a one-time code exchanged for the JWT, so no bearer rides in the
            // deep-link URL) intersects this invite flow and is deferred to the
            // joint mobile session — see NEEDS-HUMAN-DECISION.
            Task {
                _ = try? await container.auth.handleCallback(url: url)
                await bootstrap()
            }
        }
        .environment(\.locale, Locale(identifier: localeCode))
        .preferredColorScheme(AppTheme(rawValue: themeRaw)?.colorScheme)
        .onAppear {
            if !hasSeenLanguagePicker {
                showLanguageSheet = true
            }
        }
        .sheet(isPresented: $showLanguageSheet, onDismiss: {
            hasSeenLanguagePicker = true
        }) {
            FirstLaunchLanguageSheet(isPresented: $showLanguageSheet)
        }
    }

    private func bootstrap() async {
        if !container.isDemoMode {
            guard await container.auth.currentToken() != nil else {
                phase = hasSeenWelcome ? .signIn : .welcome
                return
            }
        }
        do {
            let meResponse: MeResponse = try await container.api.send(GetMe())
            session.update(from: meResponse)
            await container.featureFlags.update(meResponse.tenant?.mobileFeatures ?? MobileFeatures())
            if meResponse.tenant == nil {
                if meResponse.memberships.isEmpty && !container.isDemoMode {
                    // User exists but has zero memberships → run onboarding
                    // tenant-setup flow against the live keychain JWT.
                    ensureOnboarding()
                    onboardingCoordinator?.start(from: .tokenButNoMemberships)
                    phase = .workspaceSetup
                } else if container.isDemoMode {
                    phase = .main
                } else {
                    // Multi-tenant or other tenant-less real-mode case: the
                    // stored bearer is functionally useless for real-mode
                    // features. Clear it and force a fresh sign-in instead of
                    // stranding the user on the empty "Kuruluş yok" picker.
                    await container.auth.clearToken()
                    session.clear()
                    phase = .signIn
                }
            } else {
                phase = .main
            }
        } catch APIError.http(401, _) {
            await container.auth.clearToken()
            session.clear()
            phase = .signIn
        } catch {
            phase = .signIn
        }
    }

    /// Lazily instantiate the onboarding coordinator + API. Bound to the
    /// current `container.auth` so JWT persistence after tenant create flows
    /// through the same keychain the rest of the app reads.
    private func ensureOnboarding() {
        if onboardingAPI == nil {
            onboardingAPI = URLSessionOnboardingAPI(client: container.api)
        }
        if onboardingCoordinator == nil, let api = onboardingAPI {
            onboardingCoordinator = OnboardingCoordinator(auth: container.auth, api: api)
        }
    }

    private func signInFlow() async throws {
        if container.isDemoMode {
            container = AppContainer(useDemoMode: false)
        }
        _ = try await container.auth.signIn()
        await bootstrap()
    }

    private func signUpFlow() async throws {
        if container.isDemoMode {
            container = AppContainer(useDemoMode: false)
        }
        _ = try await container.auth.signUp()
        await bootstrap()
    }

    /// Switches the container into demo/preview mode, fetches the demo `/me`
    /// payload, and routes to the main shell with a fully populated session
    /// (user, tenant, permissions, feature flags). Falls back to `.signIn` if
    /// the demo client unexpectedly fails so the user is never stranded.
    private func skipToDemoMode() async {
        container = AppContainer(useDemoMode: true)
        do {
            let meResponse: MeResponse = try await container.api.send(GetMe())
            session.update(from: meResponse)
            await container.featureFlags.update(meResponse.tenant?.mobileFeatures ?? MobileFeatures())
            phase = .main
        } catch {
            phase = .signIn
        }
    }

    private func switchTenant(_ id: String) async {
        do {
            // Preferred: tenant-id-pinned switch endpoint introduced for the
            // in-app organization switcher. Falls back to the legacy
            // `/tenants/active` POST when the new endpoint is unavailable so
            // the org picker phase (first sign-in) keeps working.
            let resp: SetActiveTenantResponse
            do {
                resp = try await container.api.send(SwitchTenantByIdRequest(tenantId: id))
            } catch {
                resp = try await container.api.send(
                    SetActiveTenantRequest(body: SetActiveTenantBody(tenantId: id))
                )
            }
            try await container.auth.persist(token: resp.token)
            await bootstrap()
        } catch {
            // surface error in UI later
        }
    }

    private func signOut() async {
        try? await container.auth.signOut()
        if container.isDemoMode {
            container = AppContainer(useDemoMode: false)
        }
        session.clear()
        phase = .signIn
    }
}

private struct FirstLaunchLanguageSheet: View {
    @AppStorage("appLocale") private var localeCode: String = "ru"
    @Binding var isPresented: Bool

    private static let supported = ["ru", "en", "tr", "uz", "ky"]

    /// Literal key per case — `LocalizedStringKey("settings.language.\(code)")`
    /// would treat the interpolation as a format arg and render the raw key.
    private func languageLabel(_ code: String) -> LocalizedStringKey {
        switch code {
        case "ru": return "settings.language.ru"
        case "en": return "settings.language.en"
        case "tr": return "settings.language.tr"
        case "uz": return "settings.language.uz"
        case "ky": return "settings.language.ky"
        default: return LocalizedStringKey(code)
        }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(Self.supported, id: \.self) { code in
                        Button {
                            localeCode = code
                        } label: {
                            HStack {
                                Text(languageLabel(code))
                                Spacer()
                                if localeCode == code {
                                    Image(systemName: "checkmark").foregroundStyle(.tint)
                                }
                            }
                        }
                        .buttonStyle(.plain)
                    }
                } header: {
                    Text("settings.firstLaunch.title")
                } footer: {
                    Text("settings.firstLaunch.subtitle")
                }
            }
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("settings.firstLaunch.continue") {
                        isPresented = false
                    }
                }
            }
        }
        .interactiveDismissDisabled(true)
    }
}
