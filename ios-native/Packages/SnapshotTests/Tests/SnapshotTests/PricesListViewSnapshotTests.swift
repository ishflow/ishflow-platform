import APIClient
import AppShared
@testable import Prices
import SnapshotTesting
import SwiftUI
import XCTest

@MainActor
final class PricesListViewSnapshotTests: XCTestCase {
    /// Loaded state: 3 price-list catalog records.
    func testLoadedLight() {
        let view = PricesListView(api: DemoAPIClient(), previewViewModel: .fixtureLoaded)
        assertSnapshot(of: view, as: .iPhone17Light)
    }

    func testLoadedDark() {
        let view = PricesListView(api: DemoAPIClient(), previewViewModel: .fixtureLoaded)
        assertSnapshot(of: view, as: .iPhone17Dark)
    }

    /// Empty state.
    func testEmptyLight() {
        let view = PricesListView(api: DemoAPIClient(), previewViewModel: .fixtureEmpty)
        assertSnapshot(of: view, as: .iPhone17Light)
    }
}

@MainActor
private extension PricesListViewModel {
    static var fixtureLoaded: PricesListViewModel {
        let vm = PricesListViewModel(api: DemoAPIClient())
        let now = Date(timeIntervalSince1970: 1_713_139_200)
        vm.state = .loaded([
            CatalogRecord(
                id: UUID(uuidString: "00000000-0000-0000-0000-000000000071")!,
                code: "RETAIL",
                name: "Retail",
                createdAt: now,
                updatedAt: now
            ),
            CatalogRecord(
                id: UUID(uuidString: "00000000-0000-0000-0000-000000000072")!,
                code: "WHOLESALE",
                name: "Wholesale",
                createdAt: now,
                updatedAt: now
            ),
            CatalogRecord(
                id: UUID(uuidString: "00000000-0000-0000-0000-000000000073")!,
                code: "VIP",
                name: "VIP",
                createdAt: now,
                updatedAt: now
            )
        ])
        return vm
    }

    static var fixtureEmpty: PricesListViewModel {
        let vm = PricesListViewModel(api: DemoAPIClient())
        vm.state = .loaded([])
        return vm
    }
}
