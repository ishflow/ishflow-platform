@testable import Auth
import XCTest

final class KeychainTests: XCTestCase {
    func testStoreAndReadToken() throws {
        try XCTSkipIf(
            !KeychainTestSupport.canUseKeychain,
            "Keychain entitlement unavailable on unhosted iOS Simulator test bundle"
        )
        let keychain = Keychain(service: "test.ishflow.unit")
        try keychain.delete(key: "jwt")
        try keychain.set("test-token-123", forKey: "jwt")
        let read = try keychain.get(key: "jwt")
        XCTAssertEqual(read, "test-token-123")
        try keychain.delete(key: "jwt")
        let afterDelete = try keychain.get(key: "jwt")
        XCTAssertNil(afterDelete)
    }
}
