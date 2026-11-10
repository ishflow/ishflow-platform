import Core
import SwiftUI

/// Sync errors screen showing real failed mutations from the sync queue.
public struct SyncErrorsView: View {
    let fetchFailedMutations: () async -> [PendingMutationSnapshot]
    let retryAction: (UUID) async -> Void
    let retryAllAction: () async -> Void
    let clearAllAction: () async -> Void
    @State private var failedMutations: [PendingMutationSnapshot] = []

    public init(
        fetchFailedMutations: @escaping () async -> [PendingMutationSnapshot],
        retryAction: @escaping (UUID) async -> Void = { _ in },
        retryAllAction: @escaping () async -> Void = {},
        clearAllAction: @escaping () async -> Void = {}
    ) {
        self.fetchFailedMutations = fetchFailedMutations
        self.retryAction = retryAction
        self.retryAllAction = retryAllAction
        self.clearAllAction = clearAllAction
    }

    public var body: some View {
        List {
            if !failedMutations.isEmpty {
                Section {
                    ForEach(failedMutations, id: \.id) { mutation in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(QueuedMutationLabel.title(mutation))
                                .font(.headline)
                            Text("syncItem.status.failed")
                                .font(.caption)
                                .foregroundStyle(.red)
                            HStack {
                                Spacer()
                                Button {
                                    Task {
                                        await retryAction(mutation.id)
                                        await reload()
                                    }
                                } label: {
                                    Label("settings.syncErrors.retry", systemImage: "arrow.clockwise")
                                        .font(.subheadline)
                                }
                                .buttonStyle(.bordered)
                                .controlSize(.small)
                            }
                        }
                    }
                }
                Section {
                    HStack {
                        Button("settings.syncErrors.retryAll") {
                            Task {
                                await retryAllAction()
                                await reload()
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        Spacer()
                        Button("settings.syncErrors.clearAll", role: .destructive) {
                            Task {
                                await clearAllAction()
                                await reload()
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("settings.syncErrors")
        .task {
            await reload()
        }
        .overlay {
            if failedMutations.isEmpty {
                ContentUnavailableView(
                    "settings.syncErrors.empty",
                    systemImage: "checkmark.icloud"
                )
            }
        }
    }

    private func reload() async {
        failedMutations = await fetchFailedMutations()
    }
}
