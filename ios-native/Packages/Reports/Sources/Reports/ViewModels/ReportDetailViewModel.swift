import APIClient
import Foundation
import Observation

@MainActor
@Observable
public final class ReportDetailViewModel {
    public private(set) var summary: ReportSummary?
    public private(set) var isLoading = false
    public private(set) var error: String?

    private let api: any APIClient
    public let type: ReportType

    public init(api: any APIClient, type: ReportType) {
        self.api = api
        self.type = type
    }

    public func load(period: ReportPeriod) async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        let request = SummaryRequest(
            path: "/api/mobile/reports/\(type.rawValue)/summary",
            query: ["period": period.serverId]
        )
        do {
            summary = try await api.send(request)
        } catch {
            self.error = String(describing: error)
        }
    }
}

private struct SummaryRequest: APIRequest {
    typealias Response = ReportSummary
    let path: String
    let method: HTTPMethod = .get
    let query: [String: String]?
}
