import Core
import SwiftUI

/// Lists mutations queued offline that haven't successfully synced yet.
/// Read-only — these auto-drain once the device is back online, so there's
/// no retry button (failed ones get their own tab via `SyncErrorsView`).
public struct OfflineQueueView: View {
    let fetchPendingMutations: () async -> [PendingMutationSnapshot]
    @State private var pending: [PendingMutationSnapshot] = []
    @State private var loaded = false

    public init(fetchPendingMutations: @escaping () async -> [PendingMutationSnapshot]) {
        self.fetchPendingMutations = fetchPendingMutations
    }

    public var body: some View {
        List {
            if !pending.isEmpty {
                Section {
                    ForEach(pending, id: \.id) { mutation in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(QueuedMutationLabel.title(mutation))
                                .font(.headline)
                            Text("syncItem.status.waiting")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 2)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .overlay {
            if loaded, pending.isEmpty {
                ContentUnavailableView(
                    "offline.empty.title",
                    systemImage: "icloud.and.arrow.up",
                    description: Text("offline.empty.message")
                )
            }
        }
        .task { await reload() }
        .refreshable { await reload() }
    }

    private func reload() async {
        pending = await fetchPendingMutations()
        loaded = true
    }
}
