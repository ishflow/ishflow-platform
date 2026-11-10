import Foundation
import SwiftData

/// SwiftData entity representing a queued mutation awaiting delivery to the backend.
/// Each row stores everything needed to retry a request idempotently.
@Model
public final class PendingMutation {
    /// Stable, unique identifier of the mutation row.
    @Attribute(.unique) public var id: UUID
    /// Endpoint path the request targets (e.g. `/v1/sales-invoices`).
    public var endpoint: String
    /// HTTP method (`POST`, `PUT`, etc.).
    public var method: String
    /// Encoded request body.
    public var body: Data
    /// Idempotency key sent in the `Idempotency-Key` header. Stable across retries.
    public var idempotencyKey: UUID
    /// Number of dispatch attempts made so far.
    public var attempts: Int
    /// Last error description, if any.
    public var lastError: String?
    /// Lifecycle status: `"pending"` while retryable, `"failed"` once max attempts is hit.
    public var status: String
    /// Wall-clock creation time, used to drain the queue in FIFO order.
    public var createdAt: Date

    /// Create a new pending mutation. Defaults generate a fresh `id`/`idempotencyKey`
    /// and stamp `createdAt = .now` so callers can simply pass the request payload.
    public init(
        id: UUID = UUID(),
        endpoint: String,
        method: String,
        body: Data,
        idempotencyKey: UUID = UUID(),
        attempts: Int = 0,
        lastError: String? = nil,
        status: String = "pending",
        createdAt: Date = .now
    ) {
        self.id = id
        self.endpoint = endpoint
        self.method = method
        self.body = body
        self.idempotencyKey = idempotencyKey
        self.attempts = attempts
        self.lastError = lastError
        self.status = status
        self.createdAt = createdAt
    }
}

/// Sendable scalar copy of a `PendingMutation`, safe to hand to `@Sendable` closures
/// crossing actor boundaries (the underlying `@Model` reference type is not Sendable
/// under Swift 6 strict concurrency).
public struct PendingMutationSnapshot: Sendable, Equatable {
    /// Stable identifier mirroring `PendingMutation.id`.
    public let id: UUID
    /// Endpoint path.
    public let endpoint: String
    /// HTTP method.
    public let method: String
    /// Encoded body.
    public let body: Data
    /// Idempotency key.
    public let idempotencyKey: UUID
    /// Attempt count at the time the snapshot was taken.
    public let attempts: Int
    /// Last error description, if any.
    public let lastError: String?
    /// Original creation time.
    public let createdAt: Date

    /// Capture a snapshot of the supplied mutation.
    public init(_ mutation: PendingMutation) {
        id = mutation.id
        endpoint = mutation.endpoint
        method = mutation.method
        body = mutation.body
        idempotencyKey = mutation.idempotencyKey
        attempts = mutation.attempts
        lastError = mutation.lastError
        createdAt = mutation.createdAt
    }
}
