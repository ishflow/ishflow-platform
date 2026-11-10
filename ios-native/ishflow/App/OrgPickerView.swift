import AppShared
import SwiftUI

/// Tenant picker shown when the authenticated user has no active tenant on the
/// `/v1/me` payload, or has multiple tenants and must choose one. Renders an
/// empty-state view when `tenants` is empty (e.g. user has not been invited).
struct OrgPickerView: View {
    let tenants: [TenantSummary]
    let onPick: (TenantSummary) -> Void

    var body: some View {
        NavigationStack {
            if tenants.isEmpty {
                ContentUnavailableView(
                    "org.empty.title",
                    systemImage: "building.2",
                    description: Text("org.empty.description")
                )
            } else {
                List(tenants, id: \.id) { tenant in
                    Button {
                        onPick(tenant)
                    } label: {
                        VStack(alignment: .leading) {
                            Text(tenant.name).font(.headline)
                            Text(tenant.slug).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
                .navigationTitle("org.title")
            }
        }
    }
}
