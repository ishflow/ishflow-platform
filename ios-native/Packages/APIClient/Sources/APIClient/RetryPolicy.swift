import Foundation

/// Retry policy describing how many attempts to make and how long to wait between them.
public struct RetryPolicy: Sendable {
    /// Maximum number of attempts before the policy is considered exhausted.
    public let maxAttempts: Int
    private let baseDelay: TimeInterval

    /// Creates a policy with the given attempt cap and base delay (seconds).
    public init(maxAttempts: Int, baseDelay: TimeInterval) {
        self.maxAttempts = maxAttempts
        self.baseDelay = baseDelay
    }

    /// Builds an exponential backoff policy: delay doubles each attempt.
    public static func exponential(maxAttempts: Int = 5, baseDelay: TimeInterval = 1.0) -> RetryPolicy {
        RetryPolicy(maxAttempts: maxAttempts, baseDelay: baseDelay)
    }

    /// Delay (seconds) to wait before the given 1-based attempt number.
    public func delay(forAttempt attempt: Int) -> TimeInterval {
        baseDelay * pow(2.0, Double(attempt - 1))
    }

    /// Whether the policy has reached or exceeded its attempt cap.
    public func isExhausted(attemptsSoFar: Int) -> Bool {
        attemptsSoFar >= maxAttempts
    }
}
