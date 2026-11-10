import AppShared
@testable import Core
import XCTest

final class FeatureFlagsTests: XCTestCase {
    func testUpdateAndQuery() async {
        let flags = FeatureFlags()
        await flags.update(MobileFeatures(sales: false, prices: true, inventory: true))
        let salesOn = await flags.isEnabled(\.sales)
        let pricesOn = await flags.isEnabled(\.prices)
        XCTAssertFalse(salesOn)
        XCTAssertTrue(pricesOn)
    }
}
