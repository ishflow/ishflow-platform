import APIClient
import AppShared
import Foundation
import Observation

/// Formatting helpers shared by the billing UI. The backend encodes
/// "unlimited" plan limits as JS `Number.MAX_SAFE_INTEGER` (9007199254740991),
/// which must never be rendered as a literal number.
public enum BillingFormat {
    /// Any limit at or above this sentinel is treated as unlimited. Storage
    /// limits arrive in bytes (hundreds of GB ≈ 1e11), so the threshold sits
    /// far above any real quota but at/below MAX_SAFE_INTEGER.
    public static let unlimitedSentinel = 9_000_000_000_000_000

    /// `true` when the backend means "no limit" for this quota.
    public static func isUnlimited(_ limit: Int) -> Bool {
        limit >= unlimitedSentinel
    }

    /// Human byte count; avoids ByteCountFormatter's "Zero KB" spelling.
    public static func byteCount(_ bytes: Int) -> String {
        if bytes == 0 { return "0 KB" }
        return ByteCountFormatter.string(fromByteCount: Int64(bytes), countStyle: .file)
    }
}

/// View model driving `BillingView`.
///
/// Owns the async lifecycle for `GET /api/mobile/billing` (snapshot) and
/// `POST /api/mobile/billing/handoff` (Stripe hand-off URLs). All
/// network failures are surfaced as `.failed(message)` so the view can
/// render a recoverable error state.
@Observable
@MainActor
public final class BillingViewModel {
    /// Snapshot fetch lifecycle.
    public enum State {
        /// Before the first `load()` call.
        case idle
        /// `load()` is in flight.
        case loading
        /// Snapshot available.
        case ready(BillingResponse)
        /// `load()` failed with a localized message.
        case failed(String)
    }

    /// Current snapshot lifecycle state.
    public private(set) var state: State = .idle
    /// `true` while a handoff URL request is in flight; lets the view
    /// disable buttons / show a spinner without changing `state`.
    public private(set) var openingHandoff: Bool = false

    private let api: any APIClient

    public init(api: any APIClient) {
        self.api = api
    }

    /// Fetch the billing snapshot. Transitions through `.loading`.
    public func load() async {
        state = .loading
        do {
            let response = try await api.send(BillingRequest())
            state = .ready(response)
        } catch {
            state = .failed(error.localizedDescription)
        }
    }

    /// Request a Stripe Billing Portal handoff URL.
    ///
    /// Returns `nil` if the snapshot isn't loaded yet or the network call
    /// fails. The view is expected to present the returned URL in
    /// `SFSafariViewController`.
    public func openManageOnWeb() async -> URL? {
        guard case .ready = state else { return nil }
        openingHandoff = true
        defer { openingHandoff = false }
        do {
            let response = try await api.send(BillingHandoffRequest(target: .portal))
            return response.url
        } catch {
            return nil
        }
    }

    /// Request a Stripe Checkout handoff URL.
    ///
    /// Returns `nil` on network failure. Pass `targetPlan: nil` to let the
    /// web side present the full plan picker; pass a slug to jump directly
    /// to that plan's checkout.
    public func openSeePlans(
        targetPlan: String?,
        interval: BillingHandoffRequest.Interval = .month
    ) async -> URL? {
        openingHandoff = true
        defer { openingHandoff = false }
        do {
            let response = try await api.send(
                BillingHandoffRequest(target: .checkout, plan: targetPlan, interval: interval)
            )
            return response.url
        } catch {
            return nil
        }
    }

    /// Number of whole days left in the trial, rounded up.
    ///
    /// Returns `nil` when the snapshot isn't ready, when the tenant isn't on
    /// a trial, or when the trial has already expired.
    public var trialDaysLeft: Int? {
        guard case let .ready(snap) = state, let ends = snap.trialEndsAt else {
            return nil
        }
        let days = Int(ceil(ends.timeIntervalSinceNow / 86_400))
        return days > 0 ? days : nil
    }
}
