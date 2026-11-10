import Foundation
import SwiftData

/// Drains queued offline mutations against a caller-supplied `send` closure.
/// Mutations are persisted via SwiftData so they survive app launches; on success
/// the row is deleted, on failure attempts is incremented and the row is marked
/// `"failed"` after `maxAttempts` is reached.
public actor SyncQueue {
    private let modelContainer: ModelContainer
    private let send: @Sendable (PendingMutationSnapshot) async throws -> Void
    private let maxAttempts: Int

    /// Create a new sync queue.
    /// - Parameters:
    ///   - modelContainer: SwiftData container that owns the `PendingMutation` table.
    ///   - maxAttempts: Number of dispatch attempts before a mutation is marked failed.
    ///   - send: Closure that performs the actual network call for one snapshot.
    public init(
        modelContainer: ModelContainer,
        maxAttempts: Int = 5,
        send: @escaping @Sendable (PendingMutationSnapshot) async throws -> Void
    ) {
        self.modelContainer = modelContainer
        self.send = send
        self.maxAttempts = maxAttempts
    }

    /// Persist a new pending mutation and return its idempotency key so the caller
    /// can correlate the eventual delivery with the original request. Pass
    /// `idempotencyKey` to reuse the key the original (failed) request already
    /// sent, so the server dedupes the replay against any partial processing.
    public func enqueue(
        endpoint: String,
        method: String,
        body: Data,
        idempotencyKey: UUID = UUID()
    ) async throws -> UUID {
        let context = ModelContext(modelContainer)
        let mutation = PendingMutation(
            endpoint: endpoint,
            method: method,
            body: body,
            idempotencyKey: idempotencyKey
        )
        context.insert(mutation)
        try context.save()
        return mutation.idempotencyKey
    }

    /// Persist a mutation straight into the `failed` bucket — used when a write
    /// reached the network layer but could not be delivered (server down / 5xx)
    /// while the device itself is online. It is *not* auto-drained; the user
    /// reviews and re-issues it from the notification center's sync-errors tab.
    public func recordFailed(
        endpoint: String,
        method: String,
        body: Data,
        idempotencyKey: UUID = UUID(),
        error: String
    ) {
        let context = ModelContext(modelContainer)
        let mutation = PendingMutation(
            endpoint: endpoint,
            method: method,
            body: body,
            idempotencyKey: idempotencyKey,
            attempts: maxAttempts,
            lastError: error,
            status: "failed"
        )
        context.insert(mutation)
        try? context.save()
    }

    /// Attempt to deliver the oldest pending mutation. On success the row is removed.
    /// On failure the attempt counter is bumped and, once `maxAttempts` is hit, the
    /// row is marked `"failed"` so the user can review or retry it from Settings.
    public func processNext() async {
        let context = ModelContext(modelContainer)
        let descriptor = FetchDescriptor<PendingMutation>(
            predicate: #Predicate { $0.status == "pending" },
            sortBy: [SortDescriptor(\.createdAt)]
        )
        guard let mutation = try? context.fetch(descriptor).first else { return }
        let snapshot = PendingMutationSnapshot(mutation)
        do {
            try await send(snapshot)
            context.delete(mutation)
            try context.save()
        } catch {
            mutation.attempts += 1
            mutation.lastError = String(describing: error)
            if mutation.attempts >= maxAttempts {
                mutation.status = "failed"
            }
            try? context.save()
        }
    }

    /// Returns the number of mutations currently in the `failed` bucket.
    public func failedMutationCount() -> Int {
        let context = ModelContext(modelContainer)
        let descriptor = FetchDescriptor<PendingMutation>(
            predicate: #Predicate { $0.status == "failed" }
        )
        return (try? context.fetchCount(descriptor)) ?? 0
    }

    /// Returns the IDs of all failed mutations. Returning the live `@Model` instances
    /// would violate Sendable across the actor boundary, so callers re-fetch by ID
    /// inside the appropriate context.
    public func failedMutationIDs() -> [UUID] {
        let context = ModelContext(modelContainer)
        let descriptor = FetchDescriptor<PendingMutation>(
            predicate: #Predicate { $0.status == "failed" }
        )
        return (try? context.fetch(descriptor).map(\.id)) ?? []
    }

    /// Returns snapshots of all failed mutations for display in Settings.
    public func failedMutations() -> [PendingMutationSnapshot] {
        let context = ModelContext(modelContainer)
        let descriptor = FetchDescriptor<PendingMutation>(
            predicate: #Predicate { $0.status == "failed" }
        )
        return (try? context.fetch(descriptor).map(PendingMutationSnapshot.init)) ?? []
    }

    /// Returns snapshots of mutations still in the `pending` bucket — i.e.
    /// queued offline (or mid-retry) and not yet successfully delivered.
    /// Sorted oldest-first so the UI can show the next-up entry.
    public func pendingMutations() -> [PendingMutationSnapshot] {
        let context = ModelContext(modelContainer)
        let descriptor = FetchDescriptor<PendingMutation>(
            predicate: #Predicate { $0.status == "pending" },
            sortBy: [SortDescriptor(\.createdAt)]
        )
        return (try? context.fetch(descriptor).map(PendingMutationSnapshot.init)) ?? []
    }

    /// Re-enqueues a previously failed mutation. Resets `status` to `"pending"`,
    /// clears the attempt counter and last error so the next `processNext()`
    /// drain will try delivery again. No-ops if the row no longer exists.
    public func retryFailedMutation(id: UUID) {
        let context = ModelContext(modelContainer)
        let descriptor = FetchDescriptor<PendingMutation>(
            predicate: #Predicate { $0.id == id }
        )
        if let mutation = try? context.fetch(descriptor).first {
            mutation.status = "pending"
            mutation.attempts = 0
            mutation.lastError = nil
            try? context.save()
        }
    }
}
