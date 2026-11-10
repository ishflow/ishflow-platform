import AppShared
import SwiftUI

/// Bottom sheet that lists every tenant the user belongs to and lets them
/// switch the active organization. Mirrors web's Clerk `OrganizationSwitcher`.
/// Tapping a row dismisses the sheet and invokes `onPick(tenantId)` which
/// the host owns — it should call the `/api/mobile/tenants/:id/switch`
/// endpoint, replace the stored bearer, and re-bootstrap the app.
struct OrganizationSwitcherSheet: View {
    let memberships: [MembershipSummary]
    let onPick: (String) -> Void
    let onCancel: () -> Void

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(memberships) { m in
                        Button {
                            onPick(m.tenantId)
                        } label: {
                            row(m)
                        }
                        .buttonStyle(.plain)
                    }
                } header: {
                    Text("orgSwitcher.heading")
                } footer: {
                    Text("orgSwitcher.footer")
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("orgSwitcher.title")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("orgSwitcher.close") { onCancel() }
                }
            }
        }
    }

    @ViewBuilder
    private func row(_ m: MembershipSummary) -> some View {
        HStack(spacing: 14) {
            initialCircle(String(m.tenantName.prefix(1)).uppercased())
                .frame(width: 36, height: 36)
                .clipShape(Circle())

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
        .padding(.vertical, 6)
        .contentShape(Rectangle())
    }

    @ViewBuilder
    private func initialCircle(_ initial: String) -> some View {
        ZStack {
            Circle().fill(.tint.opacity(0.15))
            Text(initial)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(.tint)
        }
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
