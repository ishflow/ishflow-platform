import APIClient
import AppShared
import Auth
import Core
import Foundation
import SwiftData
import UIKit

/// Top-level dependency-injection container. Owns the app's long-lived services
/// (auth, networking, sync queue, feature flags, push) and is created once at
/// scene launch. `@Observable` so SwiftUI views can subscribe to nested
/// `@Observable` services if needed.
@MainActor
@Observable
public final class AppContainer {
    /// Base URL for backend API calls.
    public let baseURL: URL
    /// Bearer-injected API client used for all backend calls.
    let api: any APIClient
    /// Whether the app is running in demo/preview mode without auth.
    let isDemoMode: Bool
    /// Authentication service; persists JWT in the keychain.
    let auth: ClerkAuthService
    /// Network reachability monitor.
    let reachability: Reachability
    /// Tenant-scoped feature flags fetched from `/v1/me`.
    let featureFlags: FeatureFlags
    /// Push notification authorization + token registration helper.
    let pushService: PushService
    /// SwiftData store for queued offline mutations.
    let modelContainer: ModelContainer
    /// Drains queued mutations against the backend.
    let syncQueue: SyncQueue

    /// Build the container with default production wiring.
    init(useDemoMode: Bool = false) {
        #if DEBUG
        // Local V2 dev server. The iOS simulator reaches the host's loopback
        // directly; cleartext HTTP is permitted via NSAllowsLocalNetworking
        // in Info.plist. Release builds keep pointing at production.
        // swiftlint:disable:next force_unwrapping
        let baseURL = URL(string: "http://localhost:3100")!
        #else
        // swiftlint:disable:next force_unwrapping
        let baseURL = URL(string: "https://ishflow.com")!
        #endif
        let keychain = Keychain(service: "dev.ishflow.ios.auth")

        #if DEBUG
        // Dev-bypass parity with Android's `signInDevOverride`: when the dev
        // server runs DEV_AUTH_BYPASS=1 the Bearer value is ignored and every
        // request resolves to the fixed dev tenant. Seed a placeholder token
        // so `AppRoot.bootstrap()` clears its `currentToken() != nil` gate and
        // goes straight to /me against the real API (never demo mode). No-op
        // once a real token has been persisted.
        if ((try? keychain.get(key: "jwt")) ?? nil) == nil {
            try? keychain.set("dev-bypass", forKey: "jwt")
        }
        #endif
        // Production sign-in entry point (web flow lives on main).
        // `/sign-in/mobile` renders Clerk's hosted page with `forceRedirectUrl=/sign-in/mobile/complete?return_url=…`
        // which mints a Clerk-template JWT and 302s to the `ishflow://` deep link the
        // ASWebAuthenticationSession callbackURLScheme intercepts.
        // swiftlint:disable:next force_unwrapping
        let signInURL = URL(string: "https://ishflow.com/sign-in/mobile?return_url=ishflow%3A%2F%2Fauth%2Fcallback")!
        // Production sign-up entry point — mirror of `signInURL` on `/sign-up/mobile`.
        // swiftlint:disable:next force_unwrapping
        let signUpURL = URL(string: "https://ishflow.com/sign-up/mobile?return_url=ishflow%3A%2F%2Fauth%2Fcallback")!
        let auth = ClerkAuthService(
            signInURL: signInURL,
            signUpURL: signUpURL,
            callbackScheme: "ishflow",
            keychain: keychain
        )
        self.auth = auth
        self.baseURL = baseURL

        isDemoMode = useDemoMode
        if useDemoMode {
            api = DemoAPIClient()
        } else {
            api = URLSessionAPIClient(
                baseURL: baseURL,
                tokenProvider: { [auth] in await auth.currentToken() }
            )
        }
        reachability = Reachability()
        featureFlags = FeatureFlags()
        pushService = PushService()

        let config = ModelConfiguration("ishflow-sync")
        // swiftlint:disable:next force_try
        modelContainer = try! ModelContainer(
            for: PendingMutation.self,
            CachedCustomer.self,
            CachedProduct.self,
            CachedWarehouse.self,
            CachedPriceType.self,
            configurations: config
        )

        let authForQueue = auth
        syncQueue = SyncQueue(modelContainer: modelContainer) { mutation in
            var req = URLRequest(url: baseURL.appendingPathComponent(mutation.endpoint))
            req.httpMethod = mutation.method
            req.httpBody = mutation.body
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.setValue(mutation.idempotencyKey.uuidString, forHTTPHeaderField: "Idempotency-Key")
            if let token = await authForQueue.currentToken() {
                req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
            let (_, response) = try await URLSession.shared.data(for: req)
            guard let http = response as? HTTPURLResponse, 200 ..< 300 ~= http.statusCode else {
                throw URLError(.badServerResponse)
            }
        }

        #if DEBUG
        // UI-test hook: deterministically seed the notification center with one
        // sync error + one offline-waiting mutation so `NotificationCenterTests`
        // can assert the badge + rows render. Writes straight to the store
        // (sync, race-free) and clears any residue from a prior run first.
        if ProcessInfo.processInfo.arguments.contains("-uiTestSeedNotifications") {
            let ctx = ModelContext(modelContainer)
            try? ctx.delete(model: PendingMutation.self)
            ctx.insert(PendingMutation(
                endpoint: "/api/mobile/documents/sales.invoice", method: "POST", body: Data(),
                attempts: 5, lastError: "Sunucuya ulaşılamadı", status: "failed"
            ))
            ctx.insert(PendingMutation(
                endpoint: "/api/mobile/documents/sales.invoice", method: "POST", body: Data(),
                status: "pending"
            ))
            try? ctx.save()
        }
        #endif
    }
}

extension AppContainer {
    /// Wire the API client's offline-sync hooks to the reachability monitor and
    /// the sync queue, so failed/offline writes surface in the notification
    /// center. Called once after launch (and after `reachability.start()`).
    /// No-op in demo mode — the demo client never touches the network.
    func configureOfflineSync() async {
        guard let client = api as? URLSessionAPIClient else { return }
        let queue = syncQueue
        let reach = reachability
        await client.configureOffline(
            isOnline: { await reach.isOnline },
            recordPending: { endpoint, method, body, key in
                _ = try? await queue.enqueue(
                    endpoint: endpoint, method: method, body: body,
                    idempotencyKey: key ?? UUID()
                )
            },
            recordFailed: { endpoint, method, body, key, error in
                await queue.recordFailed(
                    endpoint: endpoint, method: method, body: body,
                    idempotencyKey: key ?? UUID(), error: error
                )
            }
        )
    }
}

extension AppContainer: ShareConfiguration {
    public var apiBaseURL: URL { baseURL }
    public func currentBearerToken() async -> String? {
        await auth.currentToken()
    }
}

extension AppContainer {
    /// Convert raw APNs token to hex and POST to `/api/mobile/push/register`.
    func registerPushToken(_ data: Data) async {
        let hex = await pushService.tokenString(from: data)
        // swiftlint:disable nesting
        struct Req: APIRequest {
            typealias Response = EmptyResponse
            let path = "/api/mobile/push/register"
            let method: HTTPMethod = .post
            let body: (any Encodable & Sendable)?
        }
        // swiftlint:enable nesting
        let body = PushRegisterRequest(
            token: hex,
            platform: .ios,
            deviceName: UIDevice.current.name
        )
        _ = try? await api.send(Req(body: body))
    }
}
