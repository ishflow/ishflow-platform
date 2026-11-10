import AppShared
import Foundation

/// Paginated counterparty list request used by the Cari tab.
///
/// Maps to `GET /api/mobile/counterparties` and dispatches to the
/// customer- or supplier-flavored backend handler via the `type`
/// query parameter. Optional `q` is a free-text search applied
/// against the counterparty's code and name.
public struct CounterpartyListRequest: APIRequest {
    public typealias Response = CounterpartyListResponse

    /// Whether to fetch customers or suppliers.
    public let type: CounterpartyType
    /// 1-based page index.
    public let page: Int
    /// Page size requested from the server.
    public let pageSize: Int
    /// Optional free-text search query; nil/empty means "no filter".
    public let q: String?

    /// Construct a counterparty list request.
    public init(
        type: CounterpartyType,
        page: Int = 1,
        pageSize: Int = 50,
        q: String? = nil
    ) {
        self.type = type
        self.page = page
        self.pageSize = pageSize
        self.q = q
    }

    public var path: String { "/api/mobile/counterparties" }

    public var method: HTTPMethod { .get }

    public var query: [String: String]? {
        var params: [String: String] = [
            "type": type.rawValue,
            "page": String(page),
            "pageSize": String(pageSize)
        ]
        if let q, !q.isEmpty {
            params["q"] = q
        }
        return params
    }
}
