import Foundation
import Testing
@testable import AppShared

final class MockURLProtocol: URLProtocol {
    nonisolated(unsafe) static var handler: ((URLRequest) throws -> (HTTPURLResponse, Data))?

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        guard let handler = MockURLProtocol.handler else {
            fatalError("MockURLProtocol.handler not set")
        }
        do {
            let (response, data) = try handler(request)
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}

@Suite(.serialized)
struct PDFShareServiceTests {
    private func makeMockSession() -> URLSession {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [MockURLProtocol.self]
        return URLSession(configuration: config)
    }

    @Test func downloadPDFWritesTempFileOnSuccess() async throws {
        let session = makeMockSession()
        MockURLProtocol.handler = { request in
            let response = HTTPURLResponse(
                url: request.url!,
                statusCode: 200,
                httpVersion: nil,
                headerFields: nil
            )!
            return (response, Data("fake pdf content".utf8))
        }

        let service = await PDFShareService(session: session)
        let tempURL = try await service.downloadPDF(
            documentType: "sales.invoice",
            documentId: "doc-1",
            baseURL: URL(string: "https://example.com")!,
            bearerToken: "test-token"
        )

        #expect(tempURL.lastPathComponent == "sales.invoice-doc-1.pdf")
        let data = try Data(contentsOf: tempURL)
        #expect(String(data: data, encoding: .utf8) == "fake pdf content")

        // cleanup
        try? FileManager.default.removeItem(at: tempURL)
    }

    @Test func downloadPDFThrowsOnNon200() async throws {
        let session = makeMockSession()
        MockURLProtocol.handler = { request in
            let response = HTTPURLResponse(
                url: request.url!,
                statusCode: 404,
                httpVersion: nil,
                headerFields: nil
            )!
            return (response, Data())
        }

        let service = await PDFShareService(session: session)
        await #expect(throws: PDFShareError.requestFailed(statusCode: 404)) {
            try await service.downloadPDF(
                documentType: "sales.invoice",
                documentId: "doc-1",
                baseURL: URL(string: "https://example.com")!,
                bearerToken: "test-token"
            )
        }
    }
}
