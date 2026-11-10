import Core
import SwiftUI

struct OutboxQueueSheet: View {
    @Environment(AppContainer.self) private var container
    @Environment(\.dismiss) private var dismiss
    @State private var failedMutations: [PendingMutationSnapshot] = []

    var body: some View {
        NavigationStack {
            List {
                if failedMutations.isEmpty {
                    Section {
                        Text("All caught up")
                            .foregroundStyle(.secondary)
                    }
                } else {
                    Section("Failed") {
                        ForEach(failedMutations, id: \.id) { mutation in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(mutation.endpoint)
                                    .font(.subheadline)
                                Text(mutation.createdAt, style: .relative)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                if let error = mutation.lastError {
                                    Text(error)
                                        .font(.caption)
                                        .foregroundStyle(.red)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Outbox")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Retry") {
                        Task { await container.syncQueue.processNext() }
                    }
                }
                ToolbarItem(placement: .topBarLeading) {
                    Button("Clear") {
                        Task {
                            let ids = await container.syncQueue.failedMutationIDs()
                            for id in ids {
                                await container.syncQueue.retryFailedMutation(id: id)
                            }
                        }
                    }
                    .disabled(failedMutations.isEmpty)
                }
            }
        }
        .presentationDetents([.medium, .large])
        .task { await loadFailed() }
    }

    private func loadFailed() async {
        failedMutations = await container.syncQueue.failedMutations()
    }
}
