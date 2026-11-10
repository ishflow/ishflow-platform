import APIClient
import AppShared
import Foundation
import Observation

/// View model backing `DocsListView`. Fetches documents in parallel from
/// up to four backend kinds (sales invoice, purchase invoice, payment
/// received, payment sent) according to the active `filter`, then merges
/// and sorts the resulting `DocumentSummary` list date-descending.
///
/// Partial failures are tolerated: as long as at least one kind succeeds,
/// the state transitions to `.loaded(rows)` carrying whatever survived.
/// Only the all-kinds-failed case yields `.failed`.
/// User-selected filters layered on top of `DocsListViewModel.Filter`.
/// All dimensions are optional; an empty/nil value means "no constraint
/// on this dimension". The view model threads the populated values into
/// each per-kind list request.
public struct AdvancedFilters: Equatable, Sendable {
    public var dateFrom: Date?
    public var dateTo: Date?
    public var customerIds: Set<String> = []
    public var supplierIds: Set<String> = []
    public var productIds: Set<String> = []

    public init() {}

    /// Number of dimensions that carry at least one constraint.
    /// Date range counts as one dimension regardless of from/to.
    public var activeCount: Int {
        var n = 0
        if dateFrom != nil || dateTo != nil { n += 1 }
        if !customerIds.isEmpty { n += 1 }
        if !supplierIds.isEmpty { n += 1 }
        if !productIds.isEmpty { n += 1 }
        return n
    }

    public var isEmpty: Bool { activeCount == 0 }
}

@Observable
@MainActor
public final class DocsListViewModel {
    /// Subset of `DocumentKind`s to fetch on the next `load()`.
    public enum Filter: Hashable, CaseIterable, Sendable {
        /// All four document kinds: sales invoice + payment received +
        /// purchase invoice + payment sent.
        case all
        /// Sales-side documents: sales invoice + payment received.
        case sales
        /// Purchase-side documents: purchase invoice + payment sent.
        case purchases

        /// Document kinds covered by this filter value.
        var kinds: Set<DocumentKind> {
            switch self {
            case .all:
                return Set(DocumentKind.allCases)
            case .sales:
                return [.salesInvoice, .salesPaymentReceived]
            case .purchases:
                return [.purchaseInvoice, .purchasePaymentSent]
            }
        }
    }

    /// Loading state for the merged document list.
    public enum State {
        /// Initial state before the first load.
        case idle
        /// Request(s) in flight.
        case loading
        /// Successfully loaded (possibly empty) merged list. May contain
        /// rows from a strict subset of requested kinds when some kinds
        /// failed but at least one succeeded.
        case loaded([DocumentSummary])
        /// All requested kinds failed; carries a human-readable message.
        case failed(String)
    }

    /// Active filter; determines which kinds the next `load()` fetches.
    public var filter: Filter = .all
    /// Layered advanced filters; threaded into every per-kind request.
    /// Empty by default — Apply from the filter sheet replaces in one shot.
    public var advancedFilters: AdvancedFilters = .init()
    /// Current loading state.
    public private(set) var state: State = .idle

    private let api: any APIClient
    private let tenantCurrency: () -> String
    /// Monotonic token assigned when a `load()` begins. Stale completions
    /// (older than this token) drop their results to avoid the
    /// filter-switch race where an in-flight `.all` fetch overwrites a
    /// fast `.sales` fetch fired moments later.
    private var loadToken: UInt64 = 0

    /// Create a view model bound to the given API client and a closure
    /// that supplies the active tenant's currency at fetch time.
    public init(api: any APIClient, tenantCurrency: @escaping () -> String) {
        self.api = api
        self.tenantCurrency = tenantCurrency
    }

    /// Run a parallel fetch across `filter.kinds`, then merge + sort
    /// date-descending. Tolerates per-kind failures unless every kind
    /// fails.
    public func load() async {
        loadToken &+= 1
        let token = loadToken
        // Only show the skeleton on the very first load. On subsequent
        // reloads (pull-to-refresh, tab return, post-wizard notification)
        // keep the previously loaded rows visible — swapping the body to
        // skeleton mid-refresh detaches `.refreshable` from its List and
        // cancels in-flight URLSession requests, which then surface as a
        // spurious "no connection" error.
        let isReload: Bool
        if case .loaded = state { isReload = true } else { isReload = false }
        if !isReload { state = .loading }
        let kinds = filter.kinds
        let currency = tenantCurrency()
        let filtersSnapshot = advancedFilters
        var rows: [DocumentSummary] = []
        var errors: [Error] = []

        await withTaskGroup(of: Result<[DocumentSummary], Error>.self) { group in
            for kind in kinds {
                group.addTask { [api] in
                    let req = DocumentsListRequest(
                        kind: kind,
                        pageSize: 50,
                        filters: filtersSnapshot
                    )
                    do {
                        let resp = try await api.send(req)
                        let mapped = resp.items.map {
                            DocumentSummary.from(
                                record: $0,
                                kind: kind,
                                tenantCurrency: currency
                            )
                        }
                        return .success(mapped)
                    } catch {
                        return .failure(error)
                    }
                }
            }
            for await result in group {
                switch result {
                case let .success(items): rows.append(contentsOf: items)
                case let .failure(error): errors.append(error)
                }
            }
        }

        guard token == loadToken else { return }

        // `.failed` only when every kind failed AND we have nothing to show.
        // On a reload that fails completely we keep the previous `.loaded`
        // rows so a transient connection blip doesn't wipe the screen.
        if !errors.isEmpty && errors.count == kinds.count {
            if isReload { return }
            let first = errors.first
            if let api = first as? APIError {
                state = .failed(api.localizedDescription)
            } else if let first {
                state = .failed(String(describing: first))
            } else {
                state = .failed("Unknown error")
            }
        } else {
            rows.sort { $0.date > $1.date }
            state = .loaded(rows)
        }
    }
}

/// Internal request type used by `DocsListViewModel` to fetch a single
/// document kind from `/api/mobile/documents/:kind`. Layers
/// `AdvancedFilters` onto the standard pagination query string.
private struct DocumentsListRequest: APIRequest {
    typealias Response = DocumentListResponse

    let kind: DocumentKind
    let pageSize: Int
    let filters: AdvancedFilters

    var path: String { "/api/mobile/documents/\(kind.rawValue)" }
    var method: HTTPMethod { .get }
    var query: [String: String]? {
        var dict: [String: String] = ["pageSize": String(pageSize)]
        if let from = filters.dateFrom {
            dict["from"] = Self.iso(from)
        }
        if let to = filters.dateTo {
            dict["to"] = Self.iso(to)
        }
        if !filters.customerIds.isEmpty {
            dict["customerIds"] = filters.customerIds.sorted().joined(separator: ",")
        }
        if !filters.supplierIds.isEmpty {
            dict["supplierIds"] = filters.supplierIds.sorted().joined(separator: ",")
        }
        if !filters.productIds.isEmpty {
            dict["productIds"] = filters.productIds.sorted().joined(separator: ",")
        }
        return dict
    }

    private static func iso(_ date: Date) -> String {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .iso8601)
        f.timeZone = TimeZone(identifier: "UTC")
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }
}
