import Foundation
import SwiftUI

public actor ReportShareService {
    public static let shared = ReportShareService()
    private init() {}

    public func downloadReport(
        type: String,
        format: String,
        queryItems: [URLQueryItem],
        baseURL: URL,
        bearerToken: String
    ) async throws -> URL {
        var components = URLComponents(
            url: baseURL.appendingPathComponent("api/mobile/reports/\(type)/export"),
            resolvingAgainstBaseURL: false
        )!
        components.queryItems = [URLQueryItem(name: "format", value: format)] + queryItems
        var req = URLRequest(url: components.url!)
        req.setValue("Bearer \(bearerToken)", forHTTPHeaderField: "Authorization")
        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw ReportShareError.requestFailed(
                statusCode: (response as? HTTPURLResponse)?.statusCode ?? -1
            )
        }
        let ext: String = {
            switch format {
            case "pdf":  return "pdf"
            case "xlsx": return "xlsx"
            default:     return "csv"
            }
        }()
        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("\(type)-\(Int(Date().timeIntervalSince1970)).\(ext)")
        try data.write(to: tempURL, options: .atomic)
        return tempURL
    }
}

public enum ReportShareError: Error {
    case requestFailed(statusCode: Int)
}

public struct ReportShareButton: View {
    let title: LocalizedStringKey
    let action: () async throws -> URL
    @State private var isLoading = false
    @State private var showShareSheet = false
    @State private var fileURL: URL?
    @State private var errorMessage: String?
    @State private var showError = false

    public init(title: LocalizedStringKey, action: @escaping () async throws -> URL) {
        self.title = title
        self.action = action
    }

    public var body: some View {
        Button {
            Task {
                isLoading = true
                defer { isLoading = false }
                do {
                    fileURL = try await action()
                    showShareSheet = true
                } catch {
                    errorMessage = String(localized: "reports.share.failed")
                    showError = true
                }
            }
        } label: {
            if isLoading {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle())
            } else {
                Text(title)
            }
        }
        .sheet(isPresented: $showShareSheet) {
            if let url = fileURL {
                ShareSheet(activityItems: [url])
            }
        }
        .alert("Error", isPresented: $showError) {
            Button("OK") {}
        } message: {
            if let msg = errorMessage {
                Text(msg)
            }
        }
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    let activityItems: [Any]
    let applicationActivities: [UIActivity]? = nil

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(
            activityItems: activityItems,
            applicationActivities: applicationActivities
        )
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
