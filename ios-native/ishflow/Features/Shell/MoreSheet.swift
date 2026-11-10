import APIClient
import AppShared
import Core
import Reports
import Settings
import SwiftUI

/// Half-sheet shown on top-leading avatar tap. Hosts profile/tenant
/// header plus the relocated Settings entry, the Reports placeholder,
/// help, and sign-out.
struct MoreSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppSession.self) private var session
    let api: any APIClient
    let onSignOut: () -> Void
    let onSwitchTenant: (String) async -> Void
    let fetchFailedMutations: () async -> [PendingMutationSnapshot]
    let retryFailedMutation: (UUID) async -> Void

    @State private var showSignOutConfirm = false
    @AppStorage("appLocale") private var localeCode: String = "ru"
    @Environment(\.openURL) private var openURL

    var body: some View {
        NavigationStack {
            List {
                Section { profileRow }

                Section {
                    NavigationLink {
                        OrganizationListView(
                            memberships: session.memberships,
                            onSwitch: { id in
                                dismiss()
                                await onSwitchTenant(id)
                            }
                        )
                    } label: {
                        LabeledContent {
                            Text(session.tenant?.name ?? "—")
                                .lineLimit(1)
                                .foregroundStyle(.secondary)
                        } label: {
                            Label("shell.more.organization", systemImage: "building.columns")
                        }
                    }
                }

                Section {
                    NavigationLink {
                        SettingsRootView(
                            api: api,
                            fetchFailedMutations: fetchFailedMutations,
                            retryFailedMutation: retryFailedMutation
                        )
                    } label: {
                        Label("shell.more.settings", systemImage: "gear")
                    }
                    if session.permissions.contains("reports:read") {
                        NavigationLink {
                            ReportsListView(api: api)
                        } label: {
                            Label("shell.more.reports", systemImage: "chart.bar.doc.horizontal")
                        }
                    }
                }

                Section {
                    Button {
                        // Mobile is a bridge: the real support center (tickets →
                        // super-admin inbox) lives on the web app.
                        if let url = URL(string: "https://ishflow.com/\(localeCode)/support") {
                            openURL(url)
                        }
                    } label: {
                        Label("shell.more.help", systemImage: "questionmark.circle")
                    }
                    Button(role: .destructive) {
                        showSignOutConfirm = true
                    } label: {
                        Label("shell.more.signOut", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }

            }
            .listStyle(.insetGrouped)
            .navigationTitle("shell.more.title")
            .navigationBarTitleDisplayMode(.inline)
            .confirmationDialog(
                "auth.signOut.confirm.title",
                isPresented: $showSignOutConfirm,
                titleVisibility: .visible
            ) {
                Button("auth.signOut.confirm.yes", role: .destructive) {
                    dismiss()
                    onSignOut()
                }
                Button("common.cancel", role: .cancel) {}
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    /// Profile row at the top of the sheet: avatar + name + email. Static
    /// — taps do nothing. Tenant switching now lives in its own section
    /// so the user can do it in one tap rather than diving into a
    /// sub-screen.
    @ViewBuilder
    private var profileRow: some View {
        HStack(spacing: 12) {
            AvatarCircle(user: session.user, diameter: 56)
            VStack(alignment: .leading, spacing: 2) {
                Text(displayName)
                    .font(.headline)
                if let email = session.user?.email {
                    Text(email)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
        }
        .padding(.vertical, 4)
    }


    private var displayName: String {
        let first = session.user?.firstName ?? ""
        let last  = session.user?.lastName ?? ""
        let composed = "\(first) \(last)".trimmingCharacters(in: .whitespaces)
        if !composed.isEmpty { return composed }
        return session.user?.email ?? ""
    }
}

/// Push-style screen behind the More sheet's "Organizasyon" row. Lists every
/// tenant the user belongs to with initial-circle + role label + checkmark for
/// the active one. One tap on a different organization triggers a switch and
/// the parent sheet is dismissed by the caller's `onSwitch` closure so the
/// dashboard reloads against the new tenant.
private struct OrganizationListView: View {
    let memberships: [MembershipSummary]
    let onSwitch: (String) async -> Void

    var body: some View {
        List {
            Section {
                if memberships.isEmpty {
                    ContentUnavailableView(
                        "shell.more.organization.empty.title",
                        systemImage: "building.2",
                        description: Text("shell.more.organization.empty.message")
                    )
                } else {
                    ForEach(memberships) { membership in
                        Button {
                            if membership.isCurrent { return }
                            Task { await onSwitch(membership.tenantId) }
                        } label: {
                            row(membership)
                        }
                        .buttonStyle(.plain)
                    }
                }
            } footer: {
                if memberships.count > 1 {
                    Text("shell.more.organization.footer")
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("shell.more.organization")
        .navigationBarTitleDisplayMode(.inline)
    }

    @ViewBuilder
    private func row(_ m: MembershipSummary) -> some View {
        HStack(spacing: 14) {
            ZStack {
                Circle().fill(.tint.opacity(0.15))
                Text(String(m.tenantName.prefix(1)).uppercased())
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.tint)
            }
            .frame(width: 36, height: 36)

            VStack(alignment: .leading, spacing: 2) {
                Text(m.tenantName)
                    .font(.body.weight(.medium))
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                Text(roleLabelKey(for: m.primaryRole))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            if m.isCurrent {
                Image(systemName: "checkmark")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(.tint)
            }
        }
        .padding(.vertical, 4)
        .contentShape(Rectangle())
    }

    private func roleLabelKey(for role: String) -> LocalizedStringKey {
        switch role {
        case "owner": return "role.owner"
        case "admin": return "role.admin"
        case "chief_accountant": return "role.chiefAccountant"
        case "bookkeeper": return "role.bookkeeper"
        case "cashier": return "role.cashier"
        case "buyer": return "role.buyer"
        case "sales": return "role.sales"
        case "warehouse": return "role.warehouse"
        case "viewer": return "role.viewer"
        default: return LocalizedStringKey(role)
        }
    }
}
