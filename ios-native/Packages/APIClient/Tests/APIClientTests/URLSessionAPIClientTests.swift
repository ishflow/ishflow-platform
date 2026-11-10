@testable import APIClient
import Foundation
import XCTest

private struct Echo: Codable, Equatable { let value: String }

private struct EchoRequest: APIRequest {
    typealias Response = Echo
    let path = "/echo"
    let method: HTTPMethod = .get
    let body: (any Encodable & Sendable)? = nil
}

/// Idempotent (POST) write used to exercise the offline-queue routing.
private struct CreateRequest: APIRequest {
    typealias Response = Echo
    let path = "/documents"
    let method: HTTPMethod = .post
    let body: (any Encodable & Sendable)? = Echo(value: "x")
}

/// Captures the offline side-effects fired by `URLSessionAPIClient`.
private actor OfflineRecorder {
    private(set) var pending: [(endpoint: String, method: String)] = []
    private(set) var failed: [(endpoint: String, method: String, error: String)] = []
    func addPending(_ endpoint: String, _ method: String) { pending.append((endpoint, method)) }
    func addFailed(_ endpoint: String, _ method: String, _ error: String) {
        failed.append((endpoint, method, error))
    }
}

/// URLSession stub that always throws a given connectivity error.
private final class ThrowingURLSession: URLSessionProtocol, @unchecked Sendable {
    let error: URLError
    init(_ code: URLError.Code) { error = URLError(code) }
    func data(for _: URLRequest) async throws -> (Data, URLResponse) { throw error }
}

final class URLSessionAPIClientTests: XCTestCase {
    func testGETRequestDecodesJSONResponse() async throws {
        let mockSession = MockURLSession(
            responseData: Data(#"{"value":"hello"}"#.utf8),
            statusCode: 200
        )
        let baseURL = try XCTUnwrap(URL(string: "https://example.com"))
        let client = URLSessionAPIClient(
            baseURL: baseURL,
            session: mockSession,
            tokenProvider: { nil }
        )

        let result = try await client.send(EchoRequest())
        XCTAssertEqual(result, Echo(value: "hello"))
    }

    func test402ResponseDecodesAsPlanLimitError() async throws {
        let body = Data(#"""
        {
          "error": "plan_limit_exceeded",
          "kind": "monthly_posted_docs",
          "current": 50,
          "allowed": 50,
          "upgradeTo": "pro"
        }
        """#.utf8)
        let mockSession = MockURLSession(responseData: body, statusCode: 402)
        let baseURL = try XCTUnwrap(URL(string: "https://example.com"))
        let client = URLSessionAPIClient(
            baseURL: baseURL,
            session: mockSession,
            tokenProvider: { nil }
        )

        do {
            _ = try await client.send(EchoRequest())
            XCTFail("Expected APIError.planLimit to be thrown")
        } catch let APIError.planLimit(payload) {
            XCTAssertEqual(payload.kind, .monthlyPostedDocs)
            XCTAssertEqual(payload.current, 50)
            XCTAssertEqual(payload.allowed, 50)
            XCTAssertEqual(payload.upgradeTo, "pro")
        }
    }

    func test402WithEnterpriseOnlyFeatureHasNilUpgradeTo() async throws {
        let body = Data(#"""
        {
          "error": "plan_limit_exceeded",
          "kind": "sso",
          "current": 0,
          "allowed": 0,
          "upgradeTo": null
        }
        """#.utf8)
        let mockSession = MockURLSession(responseData: body, statusCode: 402)
        let baseURL = try XCTUnwrap(URL(string: "https://example.com"))
        let client = URLSessionAPIClient(
            baseURL: baseURL,
            session: mockSession,
            tokenProvider: { nil }
        )

        do {
            _ = try await client.send(EchoRequest())
            XCTFail("Expected APIError.planLimit to be thrown")
        } catch let APIError.planLimit(payload) {
            XCTAssertEqual(payload.kind, .sso)
            XCTAssertNil(payload.upgradeTo)
        }
    }

    func test402WithUnparseableBodyFallsBackToHTTPError() async throws {
        let mockSession = MockURLSession(
            responseData: Data("not json".utf8),
            statusCode: 402
        )
        let baseURL = try XCTUnwrap(URL(string: "https://example.com"))
        let client = URLSessionAPIClient(
            baseURL: baseURL,
            session: mockSession,
            tokenProvider: { nil }
        )

        do {
            _ = try await client.send(EchoRequest())
            XCTFail("Expected APIError.http to be thrown")
        } catch let APIError.http(status, _) {
            XCTAssertEqual(status, 402)
        }
    }

    func testOfflineIdempotentWriteEnqueuesPendingAndThrowsQueued() async throws {
        let baseURL = try XCTUnwrap(URL(string: "https://example.com"))
        let client = URLSessionAPIClient(
            baseURL: baseURL,
            session: ThrowingURLSession(.notConnectedToInternet),
            tokenProvider: { nil }
        )
        let recorder = OfflineRecorder()
        await client.configureOffline(
            isOnline: { false },
            recordPending: { endpoint, method, _, _ in await recorder.addPending(endpoint, method) },
            recordFailed: { endpoint, method, _, _, error in
                await recorder.addFailed(endpoint, method, error)
            }
        )

        do {
            _ = try await client.send(CreateRequest())
            XCTFail("Expected APIError.queuedOffline")
        } catch APIError.queuedOffline {
            let pending = await recorder.pending
            let failed = await recorder.failed
            XCTAssertEqual(pending.count, 1)
            XCTAssertEqual(pending.first?.endpoint, "/documents")
            XCTAssertEqual(pending.first?.method, "POST")
            XCTAssertTrue(failed.isEmpty)
        }
    }

    func testServerUnreachableWhileOnlineRecordsSyncFailure() async throws {
        let baseURL = try XCTUnwrap(URL(string: "https://example.com"))
        let client = URLSessionAPIClient(
            baseURL: baseURL,
            session: ThrowingURLSession(.cannotConnectToHost),
            tokenProvider: { nil }
        )
        let recorder = OfflineRecorder()
        await client.configureOffline(
            isOnline: { true },
            recordPending: { endpoint, method, _, _ in await recorder.addPending(endpoint, method) },
            recordFailed: { endpoint, method, _, _, error in
                await recorder.addFailed(endpoint, method, error)
            }
        )

        do {
            _ = try await client.send(CreateRequest())
            XCTFail("Expected APIError.syncFailed")
        } catch APIError.syncFailed {
            let pending = await recorder.pending
            let failed = await recorder.failed
            XCTAssertTrue(pending.isEmpty)
            XCTAssertEqual(failed.count, 1)
            XCTAssertEqual(failed.first?.endpoint, "/documents")
        }
    }

    func testNonIdempotentGETConnectivityErrorIsNotEnqueued() async throws {
        let baseURL = try XCTUnwrap(URL(string: "https://example.com"))
        let client = URLSessionAPIClient(
            baseURL: baseURL,
            session: ThrowingURLSession(.notConnectedToInternet),
            tokenProvider: { nil }
        )
        let recorder = OfflineRecorder()
        await client.configureOffline(
            isOnline: { false },
            recordPending: { endpoint, method, _, _ in await recorder.addPending(endpoint, method) },
            recordFailed: { endpoint, method, _, _, error in
                await recorder.addFailed(endpoint, method, error)
            }
        )

        do {
            _ = try await client.send(EchoRequest())
            XCTFail("Expected APIError.network")
        } catch APIError.network {
            let pending = await recorder.pending
            let failed = await recorder.failed
            XCTAssertTrue(pending.isEmpty)
            XCTAssertTrue(failed.isEmpty)
        }
    }
}

final class MockURLSession: URLSessionProtocol, @unchecked Sendable {
    let responseData: Data
    let statusCode: Int

    init(responseData: Data, statusCode: Int) {
        self.responseData = responseData
        self.statusCode = statusCode
    }

    func data(for request: URLRequest) async throws -> (Data, URLResponse) {
        // swiftlint:disable:next force_unwrapping
        let url = request.url!
        let response = HTTPURLResponse(
            url: url,
            statusCode: statusCode,
            httpVersion: nil,
            headerFields: nil
        )
        // swiftlint:disable:next force_unwrapping
        return (responseData, response!)
    }
}
