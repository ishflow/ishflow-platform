import Foundation

/// Coalesces rapid successive `schedule(_:)` calls into a single delayed
/// execution of the most recent action. Used by search fields so that
/// each keystroke does not fire its own network request.
///
/// Typical usage from a SwiftUI view:
/// ```swift
/// @State private var debouncer = SearchDebouncer()
///
/// .onChange(of: query) { _, _ in
///     debouncer.schedule { await viewModel.load() }
/// }
/// ```
///
/// The default 300 ms interval matches Apple's Human Interface
/// Guidelines for live-search responsiveness.
@MainActor
public final class SearchDebouncer {
    private var task: Task<Void, Never>?
    private let interval: Duration

    /// Create a debouncer with the given delay (default 300 ms).
    public init(interval: Duration = .milliseconds(300)) {
        self.interval = interval
    }

    /// Schedule `action` to run after `interval`. Cancels any previously
    /// scheduled action that has not yet fired.
    public func schedule(_ action: @escaping @MainActor () async -> Void) {
        task?.cancel()
        task = Task { [interval] in
            try? await Task.sleep(for: interval)
            guard !Task.isCancelled else { return }
            await action()
        }
    }

    /// Cancel any pending action without scheduling a new one.
    public func cancel() {
        task?.cancel()
        task = nil
    }
}
