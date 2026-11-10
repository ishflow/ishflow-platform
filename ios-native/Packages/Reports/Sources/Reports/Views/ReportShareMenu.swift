import AppShared
import SwiftUI
import UIKit

public struct ReportShareMenu: View {
    let type: ReportType
    let period: ReportPeriod

    @Environment(\.shareConfiguration) private var shareConfig
    @State private var fileURL: URL?
    @State private var showShareSheet = false
    @State private var isWorking = false
    @State private var errorMessage: String?
    @State private var showError = false

    public init(type: ReportType, period: ReportPeriod) {
        self.type = type
        self.period = period
    }

    public var body: some View {
        Menu {
            Button {
                Task { await download("pdf") }
            } label: {
                Label("reports.share.pdf", systemImage: "doc.richtext")
            }
            Button {
                Task { await download("xlsx") }
            } label: {
                Label("reports.share.xlsx", systemImage: "tablecells")
            }
            Button {
                Task { await download("csv") }
            } label: {
                Label("reports.share.csv", systemImage: "doc.plaintext")
            }
        } label: {
            if isWorking {
                ProgressView()
            } else {
                Label("reports.share.title", systemImage: "square.and.arrow.up")
            }
        }
        .sheet(isPresented: $showShareSheet) {
            if let url = fileURL {
                ActivityShareSheet(items: [url])
            }
        }
        .alert("reports.error.title", isPresented: $showError) {
            Button("common.ok", role: .cancel) {}
        } message: {
            if let msg = errorMessage { Text(msg) }
        }
    }

    private func download(_ format: String) async {
        guard let shareConfig else {
            errorMessage = String(localized: "reports.error.title")
            showError = true
            return
        }
        isWorking = true
        defer { isWorking = false }
        guard let token = await shareConfig.currentBearerToken() else {
            errorMessage = String(localized: "auth.tokenMissing")
            showError = true
            return
        }
        do {
            fileURL = try await ReportShareService.shared.downloadReport(
                type: type.rawValue,
                format: format,
                queryItems: [URLQueryItem(name: "period", value: period.serverId)],
                baseURL: shareConfig.apiBaseURL,
                bearerToken: token
            )
            showShareSheet = true
        } catch {
            errorMessage = String(describing: error)
            showError = true
        }
    }
}

private struct ActivityShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
