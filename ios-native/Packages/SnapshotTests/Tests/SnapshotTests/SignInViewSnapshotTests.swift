@testable import Auth
import SnapshotTesting
import XCTest

@MainActor
final class SignInViewSnapshotTests: XCTestCase {
    func testLight() {
        let view = SignInView(signInAction: {}, skipAction: {})
        assertSnapshot(of: view, as: .iPhone17Light)
    }

    func testDark() {
        let view = SignInView(signInAction: {}, skipAction: {})
        assertSnapshot(of: view, as: .iPhone17Dark)
    }
}
