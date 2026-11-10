import AppShared
import SwiftUI

/// Shown when the signed-in user has zero permissions in the active tenant
/// (custom role created with no permission grants). Replaces the standard
/// tab shell so the user is not stranded on an empty `Главная` page with
/// no explanation.
///
/// Detection lives in `MainTabView` — when `session.permissions.isEmpty`
/// the shell short-circuits to this view instead of mounting the tab bar.
struct RoleNotConfiguredView: View {
    @Environment(AppSession.self) private var session
    let onSwitchTenant: (String) async -> Void
    let onSignOut: () -> Void

    @State private var showOrgSwitcher = false

    var body: some View {
        VStack(spacing: 24) {
            Spacer(minLength: 60)

            Image(systemName: "person.crop.circle.badge.questionmark")
                .font(.system(size: 64))
                .foregroundStyle(.tint)

            VStack(spacing: 12) {
                Text("roleNotConfigured.title")
                    .font(.title2.weight(.semibold))
                    .multilineTextAlignment(.center)
                Text("roleNotConfigured.message")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                if let tenantName = session.tenant?.name {
                    Text(tenantName)
                        .font(.footnote.weight(.medium))
                        .foregroundStyle(.tertiary)
                        .padding(.top, 4)
                }
            }
            .padding(.horizontal, 32)

            Spacer()

            VStack(spacing: 12) {
                if session.memberships.count > 1 {
                    Button {
                        showOrgSwitcher = true
                    } label: {
                        Text("roleNotConfigured.switchOrg")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 4)
                    }
                    .buttonStyle(.borderedProminent)
                }

                Button(role: .destructive) {
                    onSignOut()
                } label: {
                    Text("roleNotConfigured.signOut")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 4)
                }
                .buttonStyle(.bordered)
            }
            .padding(.horizontal, 32)
            .padding(.bottom, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemGroupedBackground))
        .sheet(isPresented: $showOrgSwitcher) {
            OrganizationSwitcherSheet(
                memberships: session.memberships,
                onPick: { tenantId in
                    showOrgSwitcher = false
                    Task { await onSwitchTenant(tenantId) }
                },
                onCancel: { showOrgSwitcher = false }
            )
            .presentationDetents([.medium, .large])
        }
    }
}
