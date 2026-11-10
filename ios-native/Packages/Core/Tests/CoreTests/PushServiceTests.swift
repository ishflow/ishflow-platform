@testable import Core
import XCTest

final class PushServiceTests: XCTestCase {
    func testTokenStringFormatting() async {
        let service = PushService()
        let data = Data([0xAB, 0xCD, 0xEF, 0x12])
        let hex = await service.tokenString(from: data)
        XCTAssertEqual(hex, "abcdef12")
    }

    func testTokenStringEmptyData() async {
        let service = PushService()
        let hex = await service.tokenString(from: Data())
        XCTAssertEqual(hex, "")
    }
}
