import XCTest
import APIClient
@testable import Reports

final class ReportDetailViewModelTests: XCTestCase {
    @MainActor
    func test_load_fetchesSummaryFromServer() async {
        let fixture = ReportSummary(
            type: .arAging,
            period: .init(from: "2026-05-01", to: "2026-05-11", label: "this-month"),
            currency: "USD",
            hero: .init(value: 100, deltaPct: nil, deltaSign: .flat),
            breakdown: []
        )
        let stub = StubAPIClient(summary: fixture)
        let vm = ReportDetailViewModel(api: stub, type: .arAging)
        await vm.load(period: .thisMonth)
        XCTAssertEqual(vm.summary?.hero.value, 100)
        XCTAssertFalse(vm.isLoading)
        XCTAssertNil(vm.error)
    }

    @MainActor
    func test_load_capturesError() async {
        let stub = StubAPIClient(error: APIError.network(URLError(.badServerResponse)))
        let vm = ReportDetailViewModel(api: stub, type: .arAging)
        await vm.load(period: .thisMonth)
        XCTAssertNil(vm.summary)
        XCTAssertNotNil(vm.error)
    }
}

private struct StubAPIClient: APIClient, @unchecked Sendable {
    let summary: ReportSummary?
    let error: Error?
    init(summary: ReportSummary? = nil, error: Error? = nil) {
        self.summary = summary
        self.error = error
    }
    func send<R: APIRequest>(_ request: R) async throws -> R.Response {
        if let error { throw error }
        guard let summary, let typed = summary as? R.Response else {
            throw APIError.decoding("StubAPIClient: response type mismatch")
        }
        return typed
    }
}
