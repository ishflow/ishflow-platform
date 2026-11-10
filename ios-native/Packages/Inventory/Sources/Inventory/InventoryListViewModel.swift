import APIClient
import AppShared
import Foundation
import Observation

/// View model backing `InventoryListView`. Loads stock balances from
/// `/api/mobile/registers/inventory.stock_balance/balance` with a
/// `?groupBy=warehouse,product` query so each (warehouse, product) pile
/// renders as its own row. The bound search query filters by warehouse
/// identifier when re-issuing the request.
@Observable
@MainActor
public final class InventoryListViewModel {
    /// Loading state for the inventory list.
    public enum State {
        case idle
        case loading
        case loaded([RegisterBalanceRow])
        case failed(String)
    }

    /// Client-side stock-status chip filter.
    public enum InventoryFilter: String, CaseIterable, Identifiable {
        case all
        case inStock
        case lowStock
        public var id: String { rawValue }
    }

    /// Multi-select filters layered on top of the chip filter — populated
    /// from the advanced filter sheet.
    public struct AdvancedFilters: Equatable, Sendable {
        public var categoryIds: Set<String> = []
        public var groupIds: Set<String> = []

        public init() {}

        public var activeCount: Int {
            (categoryIds.isEmpty ? 0 : 1) + (groupIds.isEmpty ? 0 : 1)
        }
        public var isEmpty: Bool { activeCount == 0 }
    }

    public var state: State = .idle
    public var searchText: String = ""
    public var activeFilter: InventoryFilter = .all
    public var advancedFilters: AdvancedFilters = .init()

    /// Per-product (categoryId, groupId) sideload populated on `load()` so
    /// the list can filter by category/group without an extra round-trip
    /// per row.
    public private(set) var productMetadata: [String: ProductMeta] = [:]
    /// All categories the tenant has — pre-fetched so the filter sheet
    /// picker renders instantly.
    public private(set) var categories: [CatalogRecord] = []
    /// All groups the tenant has.
    public private(set) var groups: [CatalogRecord] = []
    /// Diagnostic: last sideload error for categories (nil on success).
    public private(set) var categoriesError: String?
    /// Diagnostic: last sideload error for groups (nil on success).
    public private(set) var groupsError: String?

    public struct ProductMeta: Sendable, Equatable {
        public let categoryId: String?
        public let groupId: String?
    }

    private static let lowStockThreshold: Decimal = 10
    private let api: any APIClient

    public init(api: any APIClient) {
        self.api = api
    }

    /// Rows after applying client-side search, chip, and advanced filters.
    public var filteredRows: [RegisterBalanceRow] {
        guard case let .loaded(rows) = state else { return [] }
        var result = rows
        switch activeFilter {
        case .all:
            break
        case .inStock:
            result = result.filter { ($0.quantity?.value ?? 0) > 0 }
        case .lowStock:
            // Inclusive lower bound (zero stock counts as low) up to the
            // hard threshold. Demo data routinely has piles of 80+ units,
            // so we widen the window via the threshold rather than
            // tightening the predicate.
            result = result.filter { ($0.quantity?.value ?? 0) <= Self.lowStockThreshold }
        }
        if !advancedFilters.categoryIds.isEmpty {
            result = result.filter { row in
                guard let pid = row.groupKey["product"]?.lowercased(),
                      let meta = productMetadata[pid],
                      let cid = meta.categoryId else { return false }
                return advancedFilters.categoryIds.contains(cid)
            }
        }
        if !advancedFilters.groupIds.isEmpty {
            result = result.filter { row in
                guard let pid = row.groupKey["product"]?.lowercased(),
                      let meta = productMetadata[pid],
                      let gid = meta.groupId else { return false }
                return advancedFilters.groupIds.contains(gid)
            }
        }
        if !searchText.isEmpty {
            let q = searchText.lowercased()
            result = result.filter { row in
                let name = row.groupLabels?["product"] ?? row.groupKey["product"] ?? ""
                return name.lowercased().contains(q)
            }
        }
        return result
    }

    /// Fetch the inventory.stock balance + sideload product metadata,
    /// categories, and groups in parallel. Re-runs on every call.
    /// On reloads we keep the previously loaded rows visible — swapping
    /// the body to skeleton mid-refresh detaches `.refreshable` from its
    /// List and surfaces in-flight cancellations as a spurious
    /// "no connection" error.
    public func load() async {
        let isReload: Bool
        if case .loaded = state { isReload = true } else { isReload = false }
        if !isReload { state = .loading }
        do {
            // Three parallel fetches: balances (primary, blocking),
            // products (for category/group metadata), and the two
            // catalog lists for the filter sheet picker. Picker data
            // failure is non-fatal and silently ignored — the picker
            // simply renders empty.
            async let balancesTask: RegisterBalanceResponse = fetchBalances()
            async let metadataTask: Void = sideloadMetadata()
            async let categoriesTask: Void = sideloadCategories()
            async let groupsTask: Void = sideloadGroups()
            let resp = try await balancesTask
            _ = await (metadataTask, categoriesTask, groupsTask)
            state = .loaded(resp.rows)
            indexSpotlight(resp.rows)
        } catch let error as APIError {
            if isReload { return }
            state = .failed(error.localizedDescription)
        } catch {
            if isReload { return }
            state = .failed("error.unknown")
        }
    }

    private func fetchBalances() async throws -> RegisterBalanceResponse {
        // swiftlint:disable nesting
        struct Req: APIRequest {
            typealias Response = RegisterBalanceResponse
            let path = "/api/mobile/registers/inventory.stock_balance/balance"
            let method: HTTPMethod = .get
            let query: [String: String]?
        }
        // swiftlint:enable nesting
        return try await api.send(Req(query: ["groupBy": "warehouse,product"]))
    }

    private func sideloadMetadata() async {
        do {
            // swiftlint:disable nesting
            struct ProductsResponse: Decodable { let items: [CatalogRecord] }
            struct Req: APIRequest {
                typealias Response = ProductsResponse
                let path = "/api/mobile/catalogs/inventory.product"
                let method: HTTPMethod = .get
                let query: [String: String]?
            }
            // swiftlint:enable nesting
            let resp = try await api.send(Req(query: ["pageSize": "100"]))
            var map: [String: ProductMeta] = [:]
            for record in resp.items {
                // Normalize keys to lowercase: backend serialises UUIDs in
                // canonical lowercase, but Swift's `UUID.uuidString` is
                // UPPERCASE — without normalisation, register-row lookups
                // miss every product and the filter shows nothing.
                map[record.id.uuidString.lowercased()] = ProductMeta(
                    categoryId: record.categoryId?.lowercased(),
                    groupId: record.groupId?.lowercased()
                )
            }
            productMetadata = map
        } catch {
            // Silent failure — list still works, filter sheet narrows nothing.
        }
    }

    private func sideloadCategories() async {
        do {
            // swiftlint:disable nesting
            struct Resp: Decodable { let items: [CatalogRecord] }
            struct Req: APIRequest {
                typealias Response = Resp
                let path = "/api/mobile/catalogs/inventory.product_category"
                let method: HTTPMethod = .get
                let query: [String: String]?
            }
            // swiftlint:enable nesting
            let resp = try await api.send(Req(query: ["pageSize": "100"]))
            categories = resp.items
            categoriesError = nil
        } catch {
            categories = []
            categoriesError = String(describing: error)
        }
    }

    private func sideloadGroups() async {
        do {
            // swiftlint:disable nesting
            struct Resp: Decodable { let items: [CatalogRecord] }
            struct Req: APIRequest {
                typealias Response = Resp
                let path = "/api/mobile/catalogs/inventory.product_group"
                let method: HTTPMethod = .get
                let query: [String: String]?
            }
            // swiftlint:enable nesting
            let resp = try await api.send(Req(query: ["pageSize": "100"]))
            groups = resp.items
            groupsError = nil
        } catch {
            groups = []
            groupsError = String(describing: error)
        }
    }

    private func indexSpotlight(_ rows: [RegisterBalanceRow]) {
        var seen = Set<String>()
        for row in rows.prefix(50) {
            guard let productId = row.groupKey["product"], !seen.contains(productId) else { continue }
            seen.insert(productId)
            let product = CatalogRecord(
                id: UUID(uuidString: productId) ?? UUID(),
                code: nil,
                name: row.groupLabels?["product"] ?? productId,
                createdAt: Date(),
                updatedAt: Date()
            )
            SpotlightIndexer.indexProduct(product)
        }
    }
}
