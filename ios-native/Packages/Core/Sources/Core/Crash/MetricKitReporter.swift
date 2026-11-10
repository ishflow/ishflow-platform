import Foundation

#if canImport(MetricKit) && os(iOS)
import MetricKit

/// Subscribes to MetricKit payloads and persists crash reports to the documents directory.
///
/// Not MainActor-isolated: MXMetricManager invokes delegate methods on its own
/// dispatch queue (`com.apple.metrickit.manager.queue`). Marking this class
/// `@MainActor` causes Swift's strict-concurrency executor check to trap
/// (SIGTRAP) the moment a payload is delivered. Only file IO happens here, so
/// no main-actor affinity is needed.
public final class MetricKitReporter: NSObject, MXMetricManagerSubscriber, @unchecked Sendable {
    public static let shared = MetricKitReporter()

    private let reportsDirectory: URL
    private let fileManager = FileManager.default

    private override init() {
        let docs = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first!
        reportsDirectory = docs.appendingPathComponent("CrashReports", isDirectory: true)
        super.init()
        try? fileManager.createDirectory(at: reportsDirectory, withIntermediateDirectories: true)
    }

    /// Starts listening for MetricKit payloads.
    public func start() {
        MXMetricManager.shared.add(self)
    }

    public func didReceive(_ payloads: [MXDiagnosticPayload]) {
        for payload in payloads {
            if let crashes = payload.crashDiagnostics, !crashes.isEmpty {
                saveCrashReport(payload)
            }
        }
    }

    public func didReceive(_ payloads: [MXMetricPayload]) {
        // We only care about diagnostics (crashes), not metrics.
    }

    private func saveCrashReport(_ payload: MXDiagnosticPayload) {
        let timestamp = ISO8601DateFormatter().string(from: payload.timeStampEnd)
        let filename = "crash-\(timestamp).json"
        let url = reportsDirectory.appendingPathComponent(filename)

        do {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            // MetricKit payloads are not directly Codable, so we serialize the raw JSON.
            let data = payload.jsonRepresentation()
            try data.write(to: url)
        } catch {
            print("Failed to write crash report: \(error)")
        }
    }

    /// Returns URLs of all pending crash report files.
    public func pendingReportURLs() -> [URL] {
        (try? fileManager.contentsOfDirectory(at: reportsDirectory, includingPropertiesForKeys: nil)) ?? []
    }

    /// Deletes a crash report after successful upload.
    public func deleteReport(at url: URL) {
        try? fileManager.removeItem(at: url)
    }
}
#else
/// Stub for platforms without MetricKit.
public final class MetricKitReporter {
    public static let shared = MetricKitReporter()
    public func start() {}
    public func pendingReportURLs() -> [URL] { [] }
    public func deleteReport(at url: URL) {}
}
#endif
