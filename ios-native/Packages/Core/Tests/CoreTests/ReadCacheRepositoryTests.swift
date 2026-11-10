import Core
import SwiftData
import XCTest

final class ReadCacheRepositoryTests: XCTestCase {
    private var container: ModelContainer!
    private var repository: ReadCacheRepository!

    override func setUp() async throws {
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        container = try ModelContainer(
            for: CachedCustomer.self,
            CachedProduct.self,
            configurations: config
        )
        repository = ReadCacheRepository(modelContainer: container)
    }

    func testUpsertAndFetchCustomers() async throws {
        let dto = CustomerDTO(
            id: "1",
            code: "C001",
            name: "Test Customer",
            phone: nil,
            email: nil,
            defaultPriceTypeId: nil,
            updatedAt: Date()
        )
        try await repository.upsertCustomers([dto])
        let (customers, lastSync) = await repository.customers()
        XCTAssertEqual(customers.count, 1)
        XCTAssertEqual(customers.first?.name, "Test Customer")
        XCTAssertNotNil(lastSync)
    }

    func testUpsertAndFetchProducts() async throws {
        let dto = ProductDTO(
            id: "1",
            code: "P001",
            name: "Test Product",
            categoryId: nil,
            updatedAt: Date()
        )
        try await repository.upsertProducts([dto])
        let (products, lastSync) = await repository.products()
        XCTAssertEqual(products.count, 1)
        XCTAssertEqual(products.first?.name, "Test Product")
        XCTAssertNotNil(lastSync)
    }
}
