import APIClient
import Foundation

/// Scans for pending crash reports on launch and uploads them to the backend.
public actor CrashReportUploader {
    private let reporter: MetricKitReporter
    private let api: (any APIClient)?

    public init(
        reporter: MetricKitReporter,
        api: (any APIClient)? = nil
    ) {
        self.reporter = reporter
        self.api = api
    }

    /// Uploads all pending crash reports and deletes them on success.
    public func uploadPending() async {
        let urls = await MainActor.run { reporter.pendingReportURLs() }
        for url in urls {
            do {
                let data = try Data(contentsOf: url)
                // TODO: POST to /api/admin/crashes when endpoint is available.
                // For now, just log locally.
                if let json = try? JSONSerialization.jsonObject(with: data),
                   let pretty = try? JSONSerialization.data(withJSONObject: json, options: .prettyPrinted),
                   let string = String(data: pretty, encoding: .utf8) {
                    print("Crash report:\n\(string)")
                }
                await MainActor.run { reporter.deleteReport(at: url) }
            } catch {
                print("Failed to read crash report at \(url): \(error)")
            }
        }
    }
}
