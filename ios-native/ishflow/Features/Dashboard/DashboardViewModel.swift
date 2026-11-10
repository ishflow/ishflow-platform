import APIClient
import AppShared
import Foundation
import Observation
import UIKit

@Observable
@MainActor
final class DashboardViewModel {
    enum State {
        case idle
        case loading
        case empty               // tenant == nil
        case loaded(DashboardLayout)
        case failed(String)
    }

    var state: State = .idle
    private let api: any APIClient
    private let session: AppSession

    init(api: any APIClient, session: AppSession) {
        self.api = api
        self.session = session
    }

    func load() async {
        let isReload: Bool
        if case .loaded = state { isReload = true } else { isReload = false }
        if !isReload { state = .loading }
        do {
            // swiftlint:disable nesting
            struct DashboardRequest: APIRequest {
                typealias Response = DashboardLayout
                let path = "/api/mobile/dashboard"
                let method: HTTPMethod = .get
            }
            // swiftlint:enable nesting
            let layout = try await api.send(DashboardRequest())
            state = layout.tenant == nil ? .empty : .loaded(layout)
        } catch let error as APIError {
            if isReload { return }
            state = .failed(error.localizedDescription)
        } catch {
            if isReload { return }
            state = .failed(String(localized: "error.unknown"))
        }
    }

    /// Pull-to-refresh entry point. Re-fetches both `/me` and the dashboard
    /// so the org switcher list, tab visibility, and FAB actions stay in
    /// sync with server-side permission changes. Plays a success haptic
    /// when both calls finish; failures are silently swallowed (the
    /// existing `.loaded` value stays on screen — see `load()`'s
    /// `isReload` guard).
    func refresh() async {
        // swiftlint:disable nesting
        struct MeRequest: APIRequest {
            typealias Response = MeResponse
            let path = "/api/mobile/me"
            let method: HTTPMethod = .get
        }
        // swiftlint:enable nesting

        async let meTask: Void = { @MainActor in
            do {
                let me = try await api.send(MeRequest())
                session.update(from: me)
            } catch {
                // ignore — user already has a valid session snapshot
            }
        }()
        async let dashTask: Void = load()
        _ = await (meTask, dashTask)

        // Success haptic — fires regardless of whether `load()` swallowed an
        // error, because the user-facing signal is "your pull gesture was
        // received" not "data definitely changed". A failure path that left
        // `state` in `.failed` would already be visible; haptic is just
        // affordance.
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
    }
}
