import APIClient
import AppShared
import Foundation
import SwiftUI

/// Read-only product detail screen. Loads a single catalog record from
/// `/api/mobile/catalogs/inventory.product/:id`, plus per-warehouse stock
/// breakdown from `/api/mobile/inventory/stock` and recent stock
/// movements from `/api/mobile/registers/inventory.stock_balance/movements`.
public struct ProductDetailView: View {
    private let api: any APIClient
    private let id: UUID
    @State private var record: CatalogRecord?
    @State private var error: String?
    @State private var stockByWarehouse: [StockEntry] = []
    @State private var stockState: PanelState = .idle
    @State private var movements: [Movement] = []
    @State private var movementsState: PanelState = .idle
    @State private var prices: [PriceEntry] = []
    @State private var pricesState: PanelState = .idle
    @State private var showScanner = false
    @State private var scannedCode: String?
    @Environment(AppSession.self) private var session

    enum PanelState: Equatable { case idle, loading, loaded, failed(String) }

    struct StockEntry: Identifiable, Hashable, Decodable {
        let warehouseId: String
        let warehouseName: String
        let qty: String

        var id: String { warehouseId }

        var qtyValue: Decimal {
            Decimal(string: qty, locale: Locale(identifier: "en_US_POSIX")) ?? 0
        }
    }

    struct PriceEntry: Identifiable, Hashable, Decodable {
        let priceTypeId: String
        let priceTypeName: String
        let kind: String
        let isDefault: Bool
        let value: String

        var id: String { priceTypeId }

        var decimalValue: Decimal {
            Decimal(string: value, locale: Locale(identifier: "en_US_POSIX")) ?? 0
        }
    }

    struct Movement: Identifiable, Hashable, Decodable {
        let id: String
        let timestamp: Date
        let kind: String
        let docRef: String
        let docType: String
        let docNumber: String?
        let warehouseId: String?
        let warehouseName: String?
        let productId: String?
        let productName: String?
        let quantity: String?

        var quantityValue: Decimal {
            guard let s = quantity else { return 0 }
            return Decimal(string: s, locale: Locale(identifier: "en_US_POSIX")) ?? 0
        }

        var isIncome: Bool { quantityValue >= 0 }
    }

    public init(api: any APIClient, id: UUID) {
        self.api = api
        self.id = id
    }

    public var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if let record {
                    ProductHeaderCard(record: record)
                    ProductStockCard(state: stockState, entries: stockByWarehouse)
                    ProductPricesCard(state: pricesState, entries: prices, currency: tenantCurrency)
                    ProductRecentCard(state: movementsState, movements: movements)
                    if let scannedCode {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("inventory.detail.scanned").font(.headline)
                            Text(scannedCode)
                            Button("inventory.detail.scanToUpdate") {
                                Task { await updateBarcode(scannedCode) }
                            }
                            .buttonStyle(.borderedProminent)
                        }
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(.secondarySystemGroupedBackground))
                        .cornerRadius(12)
                    }
                } else if let error {
                    ContentUnavailableView(
                        "inventory.detail.error",
                        systemImage: "exclamationmark.triangle",
                        description: Text(error)
                    )
                } else {
                    ProgressView()
                }
            }
            .padding()
        }
        .navigationTitle("inventory.detail.title")
        .toolbar {
            Button {
                showScanner = true
            } label: {
                Image(systemName: "barcode.viewfinder")
            }
            .accessibilityLabel("inventory.detail.scan")
        }
        .sheet(isPresented: $showScanner) {
            BarcodeScanView { code in
                scannedCode = code
                showScanner = false
            }
        }
        .task {
            await load()
            // Stock + movements + prices run concurrently — none blocks
            // another and all are best-effort (failure renders inline).
            async let s: Void = loadStock()
            async let m: Void = loadMovements()
            async let p: Void = loadPrices()
            _ = await (s, m, p)
        }
    }

    private var tenantCurrency: String {
        session.tenant?.currency ?? "USD"
    }

    private func load() async {
        do {
            // swiftlint:disable nesting
            struct Req: APIRequest {
                typealias Response = CatalogRecord
                let path: String
                let method: HTTPMethod = .get
            }
            // swiftlint:enable nesting
            record = try await api.send(
                Req(path: "/api/mobile/catalogs/inventory.product/\(id.uuidString)")
            )
        } catch {
            self.error = String(describing: error)
        }
    }

    private func loadStock() async {
        stockState = .loading
        do {
            // swiftlint:disable nesting
            struct StockResponse: Decodable {
                let items: [Item]
                struct Item: Decodable {
                    let productId: String
                    let byWarehouse: [StockEntry]
                }
            }
            struct Req: APIRequest {
                typealias Response = StockResponse
                let path = "/api/mobile/inventory/stock"
                let method: HTTPMethod = .get
                let query: [String: String]?
            }
            // swiftlint:enable nesting
            // Backend keys its byProduct map on the raw `productIds` query
            // and compares against Prisma UUID rows (lowercase). UPPERCASE
            // input never matches, so the response item arrives empty even
            // when stock exists. Send canonical lowercase.
            let resp = try await api.send(Req(query: ["productIds": id.uuidString.lowercased()]))
            stockByWarehouse = resp.items.first?.byWarehouse ?? []
            stockState = .loaded
        } catch {
            stockState = .failed(String(describing: error))
        }
    }

    private func loadPrices() async {
        pricesState = .loading
        do {
            // swiftlint:disable nesting
            struct PricesResponse: Decodable { let items: [PriceEntry] }
            struct Req: APIRequest {
                typealias Response = PricesResponse
                let path: String
                let method: HTTPMethod = .get
            }
            // swiftlint:enable nesting
            let resp = try await api.send(
                Req(path: "/api/mobile/products/\(id.uuidString.lowercased())/prices")
            )
            prices = resp.items
            pricesState = .loaded
        } catch {
            pricesState = .failed(String(describing: error))
        }
    }

    private func loadMovements() async {
        movementsState = .loading
        do {
            // swiftlint:disable nesting
            struct MovementsResponse: Decodable {
                let items: [Movement]
            }
            struct Req: APIRequest {
                typealias Response = MovementsResponse
                let path = "/api/mobile/registers/inventory.stock_balance/movements"
                let method: HTTPMethod = .get
                let query: [String: String]?
            }
            // swiftlint:enable nesting
            let resp = try await api.send(
                Req(query: ["product": id.uuidString.lowercased(), "limit": "20"])
            )
            movements = resp.items
            movementsState = .loaded
        } catch {
            movementsState = .failed(String(describing: error))
        }
    }

    private func updateBarcode(_ code: String) async {
        do {
            // swiftlint:disable nesting
            struct Req: APIRequest {
                typealias Response = CatalogRecord
                let path: String
                let method: HTTPMethod = .patch
                let body: (any Encodable & Sendable)?
            }
            // swiftlint:enable nesting
            record = try await api.send(
                Req(
                    path: "/api/mobile/catalogs/inventory.product/\(id.uuidString)",
                    body: ["barcode": code]
                )
            )
            scannedCode = nil
        } catch {
            self.error = String(describing: error)
        }
    }
}

// MARK: - Cards

private struct ProductHeaderCard: View {
    let record: CatalogRecord

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Color.accentColor.opacity(0.15))
                        .frame(width: 44, height: 44)
                    Image(systemName: "shippingbox.fill")
                        .font(.title3)
                        .foregroundStyle(Color.accentColor)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(record.name)
                        .font(.title3.bold())
                        .lineLimit(2)
                    if let code = record.code, !code.isEmpty {
                        Text(code)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                Spacer(minLength: 0)
            }
            VStack(spacing: 0) {
                if let unit = record.unit, !unit.isEmpty {
                    detailRow(labelKey: "inventory.detail.unit", value: unit)
                }
                if let barcode = record.barcode, !barcode.isEmpty {
                    if record.unit != nil { Divider().padding(.leading, 0) }
                    detailRow(labelKey: "inventory.detail.barcode", value: barcode, monospaced: true)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(12)
    }

    @ViewBuilder
    private func detailRow(labelKey: LocalizedStringKey, value: String, monospaced: Bool = false) -> some View {
        HStack {
            Text(labelKey)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Spacer()
            Group {
                if monospaced {
                    Text(value).monospaced()
                } else {
                    Text(value)
                }
            }
            .font(.subheadline)
        }
        .padding(.vertical, 6)
    }
}

private struct ProductStockCard: View {
    let state: ProductDetailView.PanelState
    let entries: [ProductDetailView.StockEntry]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("inventory.detail.section.stock").font(.headline)
                Spacer()
                if case .loaded = state, !entries.isEmpty {
                    Text(totalLabel)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.primary)
                }
            }
            switch state {
            case .idle, .loading:
                HStack {
                    ProgressView().controlSize(.small)
                    Text("common.loading").font(.caption).foregroundStyle(.secondary)
                }
            case let .failed(msg):
                Text(msg).font(.caption).foregroundStyle(.red).lineLimit(2)
            case .loaded:
                if entries.isEmpty {
                    Text("inventory.detail.stock.empty")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                } else {
                    VStack(spacing: 0) {
                        ForEach(Array(entries.enumerated()), id: \.element.id) { index, entry in
                            if index > 0 { Divider() }
                            HStack {
                                Image(systemName: "building.2")
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                                    .frame(width: 18)
                                Text(entry.warehouseName)
                                    .font(.subheadline)
                                Spacer()
                                Text("\(entry.qtyValue, format: .number)")
                                    .font(.subheadline.weight(.medium))
                                    .monospacedDigit()
                            }
                            .padding(.vertical, 8)
                        }
                    }
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(12)
    }

    private var totalLabel: String {
        let sum = entries.reduce(Decimal(0)) { $0 + $1.qtyValue }
        return "\(sum)"
    }
}

private struct ProductPricesCard: View {
    let state: ProductDetailView.PanelState
    let entries: [ProductDetailView.PriceEntry]
    let currency: String

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("inventory.detail.section.prices").font(.headline)
            switch state {
            case .idle, .loading:
                HStack {
                    ProgressView().controlSize(.small)
                    Text("common.loading").font(.caption).foregroundStyle(.secondary)
                }
            case let .failed(msg):
                Text(msg).font(.caption).foregroundStyle(.red).lineLimit(2)
            case .loaded:
                if entries.isEmpty {
                    Text("inventory.detail.prices.empty")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                } else {
                    VStack(spacing: 0) {
                        ForEach(Array(entries.enumerated()), id: \.element.id) { index, entry in
                            if index > 0 { Divider() }
                            priceRow(entry)
                        }
                    }
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(12)
    }

    @ViewBuilder
    private func priceRow(_ entry: ProductDetailView.PriceEntry) -> some View {
        HStack(alignment: .center, spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(entry.priceTypeName)
                        .font(.subheadline.weight(.medium))
                        .lineLimit(1)
                    if entry.isDefault {
                        Text("inventory.detail.price.default")
                            .font(.caption2.weight(.semibold))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 1)
                            .background(Capsule().fill(Color.accentColor.opacity(0.15)))
                            .foregroundStyle(Color.accentColor)
                    }
                }
                Text(kindLabel(entry.kind))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 8)
            Text(entry.decimalValue, format: .currency(code: currency))
                .font(.subheadline.weight(.semibold))
                .monospacedDigit()
                .foregroundStyle(entry.isDefault ? .primary : .secondary)
        }
        .padding(.vertical, 8)
    }

    private func kindLabel(_ kind: String) -> String {
        switch kind {
        case "static":  return String(localized: "inventory.detail.price.static")
        case "dynamic": return String(localized: "inventory.detail.price.dynamic")
        default:        return kind
        }
    }
}

private struct ProductRecentCard: View {
    let state: ProductDetailView.PanelState
    let movements: [ProductDetailView.Movement]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("inventory.detail.section.recent").font(.headline)
            switch state {
            case .idle, .loading:
                HStack {
                    ProgressView().controlSize(.small)
                    Text("common.loading").font(.caption).foregroundStyle(.secondary)
                }
            case let .failed(msg):
                Text(msg).font(.caption).foregroundStyle(.red).lineLimit(2)
            case .loaded:
                if movements.isEmpty {
                    Text("inventory.detail.recent.empty")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                } else {
                    VStack(spacing: 0) {
                        ForEach(Array(movements.enumerated()), id: \.element.id) { index, m in
                            if index > 0 { Divider() }
                            movementRow(m)
                        }
                    }
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(12)
    }

    @ViewBuilder
    private func movementRow(_ m: ProductDetailView.Movement) -> some View {
        HStack(spacing: 10) {
            ZStack {
                Circle()
                    .fill((m.isIncome ? Color.green : Color.red).opacity(0.15))
                    .frame(width: 30, height: 30)
                Image(systemName: m.isIncome ? "arrow.down" : "arrow.up")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(m.isIncome ? .green : .red)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(m.docNumber ?? docTypeLabel(m.docType))
                    .font(.subheadline.weight(.medium))
                    .lineLimit(1)
                HStack(spacing: 6) {
                    if let warehouse = m.warehouseName, !warehouse.isEmpty {
                        Text(warehouse)
                    }
                    Text("·").foregroundStyle(.tertiary)
                    Text(m.timestamp, style: .date)
                }
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            }
            Spacer(minLength: 8)
            Text(signedQty(m))
                .font(.subheadline.weight(.semibold))
                .monospacedDigit()
                .foregroundStyle(m.isIncome ? .green : .red)
        }
        .padding(.vertical, 8)
    }

    private func signedQty(_ m: ProductDetailView.Movement) -> String {
        let q = m.quantityValue
        let sign = q >= 0 ? "+" : ""
        return "\(sign)\(q)"
    }

    private func docTypeLabel(_ docType: String) -> String {
        switch docType {
        case "sales.invoice":           return String(localized: "docs.filter.sales", bundle: .main)
        case "purchases.invoice":       return String(localized: "docs.filter.purchases", bundle: .main)
        case "sales.payment_received":  return String(localized: "docs.filter.paymentReceived", bundle: .main)
        case "purchases.payment_sent":  return String(localized: "docs.filter.paymentSent", bundle: .main)
        default:                        return docType
        }
    }
}
