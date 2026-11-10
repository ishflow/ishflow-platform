import APIClient
import AppShared
@testable import Sales
import SnapshotTesting
import SwiftUI
import XCTest

@MainActor
final class SalesListViewSnapshotTests: XCTestCase {
    /// Loaded state: 3 invoices (draft / posted / cancelled).
    func testLoadedLight() {
        let view = makeSalesList(with: SalesListViewModel.fixtureLoaded)
            .environment(AppSession.fixtureRUB)
        assertSnapshot(of: view, as: .iPhone17Light)
    }

    func testLoadedDark() {
        let view = makeSalesList(with: SalesListViewModel.fixtureLoaded)
            .environment(AppSession.fixtureRUB)
        assertSnapshot(of: view, as: .iPhone17Dark)
    }

    /// Empty state.
    func testEmptyLight() {
        let view = makeSalesList(with: SalesListViewModel.fixtureEmpty)
            .environment(AppSession.fixtureRUB)
        assertSnapshot(of: view, as: .iPhone17Light)
    }

    private func makeSalesList(with vm: SalesListViewModel) -> some View {
        SalesListView(api: DemoAPIClient(), previewViewModel: vm)
    }
}

@MainActor
private extension SalesListViewModel {
    static var fixtureLoaded: SalesListViewModel {
        let vm = SalesListViewModel(api: DemoAPIClient())
        vm.state = .loaded([
            DocumentRecord(
                id: UUID(uuidString: "00000000-0000-0000-0000-000000000001")!,
                number: "INV-0001",
                date: Date(timeIntervalSince1970: 1_711_929_600),
                status: .draft,
                createdAt: Date(timeIntervalSince1970: 1_711_929_600),
                updatedAt: Date(timeIntervalSince1970: 1_711_929_600),
                customer: CatalogRef(id: UUID(), name: "Acme Corp"),
                total: "1250.00"
            ),
            DocumentRecord(
                id: UUID(uuidString: "00000000-0000-0000-0000-000000000002")!,
                number: "INV-0002",
                date: Date(timeIntervalSince1970: 1_713_139_200),
                status: .posted,
                createdAt: Date(timeIntervalSince1970: 1_713_139_200),
                updatedAt: Date(timeIntervalSince1970: 1_713_139_200),
                customer: CatalogRef(id: UUID(), name: "Globex"),
                total: "4800.50"
            ),
            DocumentRecord(
                id: UUID(uuidString: "00000000-0000-0000-0000-000000000003")!,
                number: "INV-0003",
                date: Date(timeIntervalSince1970: 1_713_571_200),
                status: .cancelled,
                createdAt: Date(timeIntervalSince1970: 1_713_571_200),
                updatedAt: Date(timeIntervalSince1970: 1_713_571_200),
                customer: CatalogRef(id: UUID(), name: "Initech"),
                total: "0.00"
            )
        ])
        return vm
    }

    static var fixtureEmpty: SalesListViewModel {
        let vm = SalesListViewModel(api: DemoAPIClient())
        vm.state = .loaded([])
        return vm
    }
}

@MainActor
private extension AppSession {
    static var fixtureRUB: AppSession {
        let session = AppSession()
        session.user = UserSummary(
            id: UUID(uuidString: "00000000-0000-0000-0000-0000000000aa")!,
            email: "demo@ishflow.com",
            firstName: "Demo",
            lastName: "User",
            imageUrl: nil
        )
        session.tenant = TenantSummary(
            id: UUID(uuidString: "00000000-0000-0000-0000-0000000000bb")!,
            slug: "demo",
            name: "Ishflow Demo",
            currency: "RUB",
            mobileFeatures: MobileFeatures()
        )
        session.permissions = []
        return session
    }
}
