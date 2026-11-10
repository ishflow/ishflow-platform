import APIClient
import Core
import SwiftUI

/// Sheet presented from the dashboard's bell icon. Hosts a 3-tab inbox:
/// Bildirimler (server-side announcements) / Senkronizasyon hataları
/// (mutations that failed all retries) / Çevrimdışı (still-queued
/// mutations waiting for connectivity).
public struct NotificationsCenterSheet: View {
    @Environment(\.dismiss) private var dismiss
    let api: any APIClient
    let fetchFailedMutations: () async -> [PendingMutationSnapshot]
    let retryFailedMutation: (UUID) async -> Void
    let retryAllFailed: () async -> Void
    let clearAllFailed: () async -> Void
    let fetchPendingMutations: () async -> [PendingMutationSnapshot]

    @State private var selectedTab: Tab = .notifications

    private enum Tab: String, Hashable {
        case notifications, syncErrors, offline
    }

    public init(
        api: any APIClient,
        fetchFailedMutations: @escaping () async -> [PendingMutationSnapshot],
        retryFailedMutation: @escaping (UUID) async -> Void = { _ in },
        retryAllFailed: @escaping () async -> Void = {},
        clearAllFailed: @escaping () async -> Void = {},
        fetchPendingMutations: @escaping () async -> [PendingMutationSnapshot] = { [] }
    ) {
        self.api = api
        self.fetchFailedMutations = fetchFailedMutations
        self.retryFailedMutation = retryFailedMutation
        self.retryAllFailed = retryAllFailed
        self.clearAllFailed = clearAllFailed
        self.fetchPendingMutations = fetchPendingMutations
    }

    public var body: some View {
        NavigationStack {
            TabView(selection: $selectedTab) {
                NotificationsInboxView(
                    api: api,
                    fetchFailedMutations: fetchFailedMutations,
                    fetchPendingMutations: fetchPendingMutations
                )
                .tabItem {
                    Label("notifCenter.tab.notifications", systemImage: "bell")
                }
                .tag(Tab.notifications)

                SyncErrorsView(
                    fetchFailedMutations: fetchFailedMutations,
                    retryAction: retryFailedMutation,
                    retryAllAction: retryAllFailed,
                    clearAllAction: clearAllFailed
                )
                .tabItem {
                    Label("notifCenter.tab.syncErrors", systemImage: "exclamationmark.arrow.triangle.2.circlepath")
                }
                .tag(Tab.syncErrors)

                OfflineQueueView(fetchPendingMutations: fetchPendingMutations)
                    .tabItem {
                        Label("notifCenter.tab.offline", systemImage: "icloud.slash")
                    }
                    .tag(Tab.offline)
            }
            .navigationTitle("notifCenter.title")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("notifCenter.close") { dismiss() }
                }
            }
        }
    }
}
