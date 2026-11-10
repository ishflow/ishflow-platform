import Foundation
import Network

/// Tracks network reachability via `NWPathMonitor` and exposes an async stream of
/// online/offline transitions. Safe to use from any task — all mutable state is
/// isolated to the actor.
public actor Reachability {
    /// Latest known reachability state. `false` until the first path update arrives.
    public private(set) var isOnline: Bool = false

    private let monitor: NWPathMonitor
    private var continuations: [AsyncStream<Bool>.Continuation] = []

    /// Create a new reachability monitor. Call `start()` to begin observing path updates.
    public init() {
        monitor = NWPathMonitor()
    }

    /// Begin monitoring the default path. Updates are dispatched onto a background
    /// queue and delivered to observers asynchronously.
    public func start() {
        monitor.pathUpdateHandler = { [weak self] path in
            Task { await self?.update(isOnline: path.status == .satisfied) }
        }
        monitor.start(queue: .global(qos: .background))
    }

    /// Stop monitoring. Outstanding observers stop receiving updates after this call.
    public func stop() {
        monitor.cancel()
    }

    private func update(isOnline: Bool) {
        guard self.isOnline != isOnline else { return }
        self.isOnline = isOnline
        for continuation in continuations {
            continuation.yield(isOnline)
        }
    }

    /// Returns an `AsyncStream` that yields the current state immediately and every
    /// subsequent transition. Multiple observers are supported.
    public func observe() -> AsyncStream<Bool> {
        AsyncStream { continuation in
            continuations.append(continuation)
            continuation.yield(isOnline)
        }
    }
}
