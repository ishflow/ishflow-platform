import APIClient
import AppShared
import Foundation

#if canImport(UIKit) && os(iOS)
import UIKit
import UserNotifications

/// Singleton actor that manages APNs token registration with the backend.
public actor APNsTokenStore {
    public static let shared = APNsTokenStore()

    private var lastToken: String?
    private let apiClient: any APIClient

    private init() {
        // Default no-op; actual API client injected via register
        self.apiClient = URLSessionAPIClient(baseURL: URL(string: "https://ishflow.com")!) { nil }
    }

    /// Stores the hex-encoded APNs token and POSTs it to the backend.
    public func set(_ token: String, api: any APIClient) async {
        guard token != lastToken else { return }
        lastToken = token
        struct Req: APIRequest {
            typealias Response = EmptyResponse
            let path = "/api/mobile/push/register"
            let method: HTTPMethod = .post
            let body: (any Encodable & Sendable)?
        }
        let deviceName = await MainActor.run { UIDevice.current.name }
        let body = PushRegisterRequest(
            token: token,
            platform: .ios,
            deviceName: deviceName
        )
        _ = try? await api.send(Req(body: body))
    }
}
#else
public actor APNsTokenStore {
    public static let shared = APNsTokenStore()
    public func set(_ token: String, api: any APIClient) async {}
}
#endif
