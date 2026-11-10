import APIClient
import AppShared
import Foundation

/// Networking boundary for onboarding mutations. The concrete actor
/// `URLSessionOnboardingAPI` wraps an `APIClient` and maps transport-level
/// failures (status codes, decode errors, offline) onto `OnboardingAPIError`.
public protocol OnboardingAPI: Sendable {
    func createTenant(name: String, currency: String, locale: String) async throws -> CreateTenantResult
    func seedDemo(tenantId: String) async throws
    func deleteAccount() async throws
}

/// Result returned by `POST /api/mobile/onboarding/tenant`.
public struct CreateTenantResult: Sendable, Equatable {
    public let tenantId: String
    public let jwt: String
    public let trialEndsAt: Date

    public init(tenantId: String, jwt: String, trialEndsAt: Date) {
        self.tenantId = tenantId
        self.jwt = jwt
        self.trialEndsAt = trialEndsAt
    }
}

/// Errors `OnboardingAPI` can surface to callers.
public enum OnboardingAPIError: Error, Sendable, Equatable {
    case alreadyOnboarded
    case soleOwnerOfTenants(tenantIds: [String])
    case network
}

/// Default `OnboardingAPI` implementation backed by `APIClient`.
public actor URLSessionOnboardingAPI: OnboardingAPI {
    private let client: any APIClient

    public init(client: any APIClient) {
        self.client = client
    }

    public func createTenant(
        name: String,
        currency: String,
        locale: String
    ) async throws -> CreateTenantResult {
        do {
            let response = try await client.send(
                CreateTenantRequest(name: name, currency: currency, locale: locale)
            )
            return CreateTenantResult(
                tenantId: response.tenantId,
                jwt: response.jwt,
                trialEndsAt: Self.parseISODate(response.trialEndsAt)
            )
        } catch {
            throw Self.mapCreateTenantError(error)
        }
    }

    public func seedDemo(tenantId: String) async throws {
        do {
            _ = try await client.send(SeedDemoRequest(tenantId: tenantId))
        } catch {
            throw OnboardingAPIError.network
        }
    }

    public func deleteAccount() async throws {
        do {
            _ = try await client.send(DeleteAccountRequest())
        } catch {
            throw Self.mapDeleteAccountError(error)
        }
    }

    // MARK: - Error mapping

    private static func mapCreateTenantError(_ error: Error) -> Error {
        if case let APIError.http(status, _) = error, status == 409 {
            return OnboardingAPIError.alreadyOnboarded
        }
        return OnboardingAPIError.network
    }

    private static func mapDeleteAccountError(_ error: Error) -> Error {
        guard case let APIError.http(status, body) = error, status == 409 else {
            return OnboardingAPIError.network
        }
        if let body, let conflict = try? JSONDecoder.ishflow.decode(DeleteAccountConflictBody.self, from: body) {
            return OnboardingAPIError.soleOwnerOfTenants(tenantIds: conflict.tenantIds)
        }
        return OnboardingAPIError.soleOwnerOfTenants(tenantIds: [])
    }

    private static func parseISODate(_ raw: String) -> Date {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: raw) {
            return date
        }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: raw) ?? Date.distantFuture
    }
}
