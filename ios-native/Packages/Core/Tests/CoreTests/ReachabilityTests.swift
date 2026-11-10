@testable import Core
import XCTest

final class ReachabilityTests: XCTestCase {
    func testStartReturnsCleanly() async {
        let reachability = Reachability()
        await reachability.start()
        await reachability.stop()
    }
}
