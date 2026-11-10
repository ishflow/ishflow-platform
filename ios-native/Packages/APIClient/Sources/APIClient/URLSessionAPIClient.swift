import Foundation

/// Minimal URLSession surface so tests can substitute a mock.
public protocol URLSessionProtocol: Sendable {
    /// Performs the request and returns the response data + metadata.
    func data(for request: URLRequest) async throws -> (Data, URLResponse)
}

extension URLSession: URLSessionProtocol {}

/// `APIClient` backed by `URLSession` with bearer-token injection.
public actor URLSessionAPIClient: APIClient {
    private let baseURL: URL
    private let session: URLSessionProtocol
    private let tokenProvider: @Sendable () async -> String?
    private var isOnline: (@Sendable () async -> Bool)?
    private var recordPending: (@Sendable (_ endpoint: String, _ method: String, _ body: Data, _ idempotencyKey: UUID?) async -> Void)?
    private var recordFailed: (@Sendable (_ endpoint: String, _ method: String, _ body: Data, _ idempotencyKey: UUID?, _ error: String) async -> Void)?

    /// Creates a client that issues requests against `baseURL`.
    public init(
        baseURL: URL,
        session: URLSessionProtocol = URLSession.shared,
        tokenProvider: @escaping @Sendable () async -> String?
    ) {
        self.baseURL = baseURL
        self.session = session
        self.tokenProvider = tokenProvider
    }

    /// Wire offline-sync side effects. When an idempotent write fails with a
    /// connectivity error, the client records it so the notification center
    /// can surface it: as a `pending` (auto-retried on reconnect) entry when
    /// the device is offline, or as a `failed` (manual-retry) sync error when
    /// the network is up but the server is unreachable. Closures are passed in
    /// to avoid an import dependency on the sync-queue module.
    public func configureOffline(
        isOnline: @escaping @Sendable () async -> Bool,
        recordPending: @escaping @Sendable (_ endpoint: String, _ method: String, _ body: Data, _ idempotencyKey: UUID?) async -> Void,
        recordFailed: @escaping @Sendable (_ endpoint: String, _ method: String, _ body: Data, _ idempotencyKey: UUID?, _ error: String) async -> Void
    ) {
        self.isOnline = isOnline
        self.recordPending = recordPending
        self.recordFailed = recordFailed
    }

    /// Sends `request` and decodes its response with `JSONDecoder.ishflow`.
    public func send<R: APIRequest>(_ request: R) async throws -> R.Response {
        let urlRequest = try await buildURLRequest(for: request)
        do {
            let (data, response) = try await session.data(for: urlRequest)
            guard let http = response as? HTTPURLResponse else {
                throw APIError.network(URLError(.badServerResponse))
            }
            guard 200 ..< 300 ~= http.statusCode else {
                if http.statusCode == 402,
                   let payload = try? JSONDecoder.ishflow.decode(
                       PlanLimitErrorPayload.self,
                       from: data
                   )
                {
                    throw APIError.planLimit(payload)
                }
                throw APIError.http(status: http.statusCode, body: data)
            }
            do {
                return try JSONDecoder.ishflow.decode(R.Response.self, from: data)
            } catch {
                throw APIError.decoding(String(describing: error))
            }
        } catch let urlError as URLError {
            // Connectivity failure on an idempotent write: persist it so the
            // sync queue (and notification center) can pick it up, reusing the
            // request's Idempotency-Key so the eventual replay dedupes against
            // any partial server-side processing.
            if request.idempotent, Self.isConnectivityError(urlError), recordPending != nil {
                let body = urlRequest.httpBody ?? Data()
                let key = urlRequest.value(forHTTPHeaderField: "Idempotency-Key").flatMap(UUID.init(uuidString:))
                if await (isOnline?() ?? true) == false {
                    await recordPending?(request.path, request.method.rawValue, body, key)
                    throw APIError.queuedOffline
                }
                await recordFailed?(request.path, request.method.rawValue, body, key, String(describing: urlError))
                throw APIError.syncFailed
            }
            throw APIError.network(urlError)
        }
    }

    /// URLError codes that indicate the request never completed against a
    /// reachable server — i.e. the device is offline or the host is down,
    /// as opposed to an application-level error the server returned.
    private static func isConnectivityError(_ error: URLError) -> Bool {
        switch error.code {
        case .notConnectedToInternet, .networkConnectionLost, .cannotConnectToHost,
             .cannotFindHost, .timedOut, .dataNotAllowed, .internationalRoamingOff,
             .dnsLookupFailed:
            true
        default:
            false
        }
    }

    private func buildURLRequest(for request: some APIRequest) async throws -> URLRequest {
        var components = URLComponents(
            url: baseURL.appendingPathComponent(request.path),
            resolvingAgainstBaseURL: false
        )
        if let query = request.query, !query.isEmpty {
            components?.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        guard let url = components?.url else { throw APIError.invalidURL }

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = request.method.rawValue
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue("application/json", forHTTPHeaderField: "Accept")

        if let token = await tokenProvider() {
            urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if request.idempotent {
            urlRequest.setValue(UUID().uuidString, forHTTPHeaderField: "Idempotency-Key")
        }

        if let body = request.body {
            urlRequest.httpBody = try JSONEncoder().encode(AnyEncodable(body))
        }

        return urlRequest
    }
}

private struct AnyEncodable: Encodable {
    let value: any Encodable
    init(_ value: any Encodable) {
        self.value = value
    }

    func encode(to encoder: Encoder) throws {
        try value.encode(to: encoder)
    }
}
