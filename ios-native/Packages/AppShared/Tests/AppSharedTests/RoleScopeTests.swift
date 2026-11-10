import Foundation
import Testing
@testable import AppShared

@Suite("AppSession — role scoping")
struct RoleScopeTests {
    private static let tenantID = UUID(uuidString: "00000000-0000-0000-0000-000000000001")!

    private func makeTenant() -> TenantSummary {
        TenantSummary(
            id: Self.tenantID,
            slug: "acme",
            name: "Acme",
            currency: "USD",
            mobileFeatures: MobileFeatures()
        )
    }

    @Test("isRoleNotConfigured is true when permissions array is empty")
    func emptyPermissionsDetected() {
        let session = AppSession()
        session.tenant = makeTenant()
        session.permissions = []
        #expect(session.isRoleNotConfigured == true)
    }

    @Test("isRoleNotConfigured is false when any permission is granted")
    func anyPermissionDisablesEmptyState() {
        let session = AppSession()
        session.tenant = makeTenant()
        session.permissions = ["sales.customer:read"]
        #expect(session.isRoleNotConfigured == false)
    }

    @Test("isRoleNotConfigured is false when no tenant is active (handled by sign-in flow)")
    func noTenantSkipsEmptyState() {
        let session = AppSession()
        session.tenant = nil
        session.permissions = []
        // No tenant means the user is in the org-picker phase, not in the
        // configured-tenant-empty-role phase. The flag must stay false to
        // let the existing routing handle it.
        #expect(session.isRoleNotConfigured == false)
    }
}
