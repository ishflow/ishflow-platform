import SwiftUI

public struct ShareButton: View {
    let title: LocalizedStringKey
    let action: () async throws -> URL
    @State private var loading = false
    @State private var shareURL: URL?
    @State private var errorMessage: String?

    public init(
        title: LocalizedStringKey = "shared.share",
        action: @escaping @MainActor () async throws -> URL
    ) {
        self.title = title
        self.action = action
    }

    public var body: some View {
        Button {
            Task { await runShare() }
        } label: {
            if loading {
                ProgressView()
            } else {
                Label(title, systemImage: "square.and.arrow.up")
            }
        }
        .disabled(loading)
        .sheet(item: Binding(
            get: { shareURL.map { ShareItem(url: $0) } },
            set: { shareURL = $0?.url }
        )) { item in
            ActivityViewController(activityItems: [item.url])
        }
        .alert("shared.shareFailed", isPresented: Binding(
            get: { errorMessage != nil },
            set: { if !$0 { errorMessage = nil } }
        )) {
            Button("ok") { errorMessage = nil }
        } message: {
            Text(errorMessage ?? "")
        }
    }

    @MainActor
    private func runShare() async {
        loading = true
        defer { loading = false }
        do {
            shareURL = try await action()
        } catch {
            errorMessage = String(describing: error)
        }
    }
}

private struct ShareItem: Identifiable {
    let id = UUID()
    let url: URL
}

private struct ActivityViewController: UIViewControllerRepresentable {
    let activityItems: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
    }

    func updateUIViewController(_ vc: UIActivityViewController, context: Context) {}
}
