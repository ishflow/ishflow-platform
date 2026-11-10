@testable import APIClient
import XCTest

final class RetryPolicyTests: XCTestCase {
    func testExponentialBackoffDelays() {
        let policy = RetryPolicy.exponential(maxAttempts: 5)
        XCTAssertEqual(policy.delay(forAttempt: 1), 1.0)
        XCTAssertEqual(policy.delay(forAttempt: 2), 2.0)
        XCTAssertEqual(policy.delay(forAttempt: 3), 4.0)
        XCTAssertEqual(policy.delay(forAttempt: 4), 8.0)
        XCTAssertEqual(policy.delay(forAttempt: 5), 16.0)
    }

    func testIsExhaustedAfterMaxAttempts() {
        let policy = RetryPolicy.exponential(maxAttempts: 5)
        XCTAssertFalse(policy.isExhausted(attemptsSoFar: 4))
        XCTAssertTrue(policy.isExhausted(attemptsSoFar: 5))
    }
}
