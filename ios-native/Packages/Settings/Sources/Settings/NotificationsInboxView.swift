import APIClient
import AppShared
import Core
import SwiftUI

private struct GetNotificationsRequest: APIRequest {
    typealias Response = NotificationListResponse
    let path = "/api/mobile/notifications"
    let method: HTTPMethod = .get
}

/// Unified notifications inbox. Surfaces locally-synthesized alerts derived
/// from the sync queue — failed writes ("Senkronizasyon hatası") and mutations
/// queued while offline ("Çevrimdışı bekliyor") — alongside server-side
/// announcements from `/api/mobile/notifications`. Newest first.
public struct NotificationsInboxView: View {
    let api: any APIClient
    let fetchFailedMutations: () async -> [PendingMutationSnapshot]
    let fetchPendingMutations: () async -> [PendingMutationSnapshot]

    @State private var entries: [InboxEntry] = []
    @State private var loaded = false

    public init(
        api: any APIClient,
        fetchFailedMutations: @escaping () async -> [PendingMutationSnapshot] = { [] },
        fetchPendingMutations: @escaping () async -> [PendingMutationSnapshot] = { [] }
    ) {
        self.api = api
        self.fetchFailedMutations = fetchFailedMutations
        self.fetchPendingMutations = fetchPendingMutations
    }

    public var body: some View {
        List {
            ForEach(entries) { entry in
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: entry.kind.icon)
                        .font(.title3)
                        .foregroundStyle(entry.kind.tint)
                        .frame(width: 28)
                    VStack(alignment: .leading, spacing: 4) {
                        entry.title
                            .font(.headline)
                        entry.message
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Text(entry.date, style: .relative)
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                }
                .padding(.vertical, 2)
                .accessibilityElement(children: .combine)
                .accessibilityIdentifier(entry.kind.accessibilityID)
            }
        }
        .navigationTitle("settings.notifications")
        .task { await load() }
        .refreshable { await load() }
        .overlay {
            if loaded, entries.isEmpty {
                ContentUnavailableView(
                    "notifications.empty.title",
                    systemImage: "bell.slash",
                    description: Text("notifications.empty.description")
                )
            }
        }
    }

    private func load() async {
        var built: [InboxEntry] = []

        // Sync errors — one entry per failed write.
        for mutation in await fetchFailedMutations() {
            built.append(InboxEntry(
                id: "sync-\(mutation.id)",
                kind: .syncError,
                title: Text("notifications.syncError.title"),
                message: Text(QueuedMutationLabel.title(mutation)),
                date: mutation.createdAt
            ))
        }

        // Offline queue — single aggregate entry while anything is waiting.
        let pending = await fetchPendingMutations()
        if !pending.isEmpty {
            built.append(InboxEntry(
                id: "offline",
                kind: .offline,
                title: Text("notifications.offline.title"),
                message: Text(LocalizedStringResource(
                    "notifications.offline.body",
                    defaultValue: "\(pending.count) operation(s) waiting to sync"
                )),
                date: pending.map(\.createdAt).max() ?? .now
            ))
        }

        // Server announcements (empty stub today; future-proofed).
        if let server = try? await api.send(GetNotificationsRequest()).items {
            for record in server {
                built.append(InboxEntry(
                    id: "srv-\(record.id)",
                    kind: .server,
                    title: Text(verbatim: record.title),
                    message: Text(verbatim: record.message),
                    date: record.date
                ))
            }
        }

        entries = built.sorted { $0.date > $1.date }
        loaded = true
    }
}

/// One row in the unified inbox. `Text` is captured eagerly so the row can mix
/// localized (sync/offline) and verbatim (server) content uniformly.
private struct InboxEntry: Identifiable {
    enum Kind {
        case syncError, offline, server

        var icon: String {
            switch self {
            case .syncError: "exclamationmark.triangle.fill"
            case .offline: "icloud.slash.fill"
            case .server: "bell.fill"
            }
        }

        var tint: Color {
            switch self {
            case .syncError: .red
            case .offline: .orange
            case .server: .accentColor
            }
        }

        /// Stable, locale-independent identifier for UI tests.
        var accessibilityID: String {
            switch self {
            case .syncError: "notif.row.syncError"
            case .offline: "notif.row.offline"
            case .server: "notif.row.server"
            }
        }
    }

    let id: String
    let kind: Kind
    let title: Text
    let message: Text
    let date: Date
}
