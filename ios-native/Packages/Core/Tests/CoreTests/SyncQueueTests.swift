@testable import Core
import SwiftData
import XCTest

final class SyncQueueTests: XCTestCase {
    private func makeContainer() throws -> ModelContainer {
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        return try ModelContainer(for: PendingMutation.self, configurations: config)
    }

    func testEnqueueStoresMutation() async throws {
        let container = try makeContainer()
        let queue = SyncQueue(modelContainer: container) { _ in }
        _ = try await queue.enqueue(endpoint: "/foo", method: "POST", body: Data())
        let context = ModelContext(container)
        let count = (try? context.fetchCount(FetchDescriptor<PendingMutation>())) ?? -1
        XCTAssertEqual(count, 1)
    }

    func testProcessNextDeletesOnSuccess() async throws {
        let container = try makeContainer()
        let queue = SyncQueue(modelContainer: container) { _ in }
        _ = try await queue.enqueue(endpoint: "/foo", method: "POST", body: Data())
        await queue.processNext()
        let context = ModelContext(container)
        let count = (try? context.fetchCount(FetchDescriptor<PendingMutation>())) ?? -1
        XCTAssertEqual(count, 0)
    }

    func testProcessNextMarksFailedAfterMaxAttempts() async throws {
        struct Boom: Error {}
        let container = try makeContainer()
        let queue = SyncQueue(modelContainer: container, maxAttempts: 2) { _ in throw Boom() }
        _ = try await queue.enqueue(endpoint: "/foo", method: "POST", body: Data())
        await queue.processNext()
        await queue.processNext()
        let failedCount = await queue.failedMutationCount()
        XCTAssertEqual(failedCount, 1)
    }
}
