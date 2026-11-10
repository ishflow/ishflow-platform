import APIClient
import AppShared
import QuickLook
import SwiftUI

/// Displays attachments for any entity with thumbnail strip,
/// scan + library buttons, and preview/share/delete actions.
/// Renders as a glass card so it sits cleanly inside the redesigned
/// wizard `ScrollView` body (no Form context required).
public struct AttachmentSection: View {
    private let entity: String
    private let entityId: UUID
    private let api: any APIClient
    @State private var attachments: [AttachmentRecord] = []
    @State private var isLoading = false
    @State private var showScanner = false
    @State private var showPicker = false
    @State private var previewUrl: URL?
    @State private var lastError: String?

    public init(entity: String, entityId: UUID, api: any APIClient) {
        self.entity = entity
        self.entityId = entityId
        self.api = api
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("field.attach.title")
                .font(WizardTokens.labelFont)
                .tracking(0.4)
                .textCase(.uppercase)
                .foregroundStyle(.secondary)

            if isLoading {
                HStack { Spacer(); ProgressView(); Spacer() }
                    .frame(height: 80)
            } else if attachments.isEmpty {
                Text("field.attach.empty")
                    .font(WizardTokens.valueFont)
                    .foregroundStyle(.secondary)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(attachments) { attachment in
                            AttachmentThumbnail(attachment: attachment)
                                .onTapGesture {
                                    if let url = URL(string: attachment.downloadUrl) {
                                        previewUrl = url
                                    }
                                }
                                .contextMenu {
                                    Button("field.attach.preview") {
                                        if let url = URL(string: attachment.downloadUrl) {
                                            previewUrl = url
                                        }
                                    }
                                    Button("field.attach.share") {
                                        share(attachment)
                                    }
                                    Button("field.attach.delete", role: .destructive) {
                                        delete(attachment)
                                    }
                                }
                        }
                    }
                    .padding(.vertical, 4)
                }
            }

            if let lastError {
                Label(lastError, systemImage: "exclamationmark.triangle.fill")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.red)
                    .padding(.top, 4)
                    .accessibilityIdentifier("attach.error")
            }

            HStack(spacing: 16) {
                Button {
                    showScanner = true
                } label: {
                    Label("field.scanner.scanDocument", systemImage: "doc.text.viewfinder")
                        .font(.system(size: 13, weight: .semibold))
                }
                .buttonStyle(.borderless)

                Button {
                    showPicker = true
                } label: {
                    Label("field.attach.fromLibrary", systemImage: "photo.on.rectangle")
                        .font(.system(size: 13, weight: .semibold))
                }
                .buttonStyle(.borderless)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: WizardTokens.cardRadius, style: .continuous)
                .fill(.ultraThinMaterial)
        )
        .overlay(
            RoundedRectangle(cornerRadius: WizardTokens.cardRadius, style: .continuous)
                .strokeBorder(WizardTokens.solidStroke, lineWidth: 0.8)
        )
        .task { await load() }
        .sheet(isPresented: $showScanner) {
            VisionDocumentScanner { images in
                showScanner = false
                Task { await uploadPDF(images: images) }
            }
        }
        .sheet(isPresented: $showPicker) {
            PHPickerWrapper { datas in
                showPicker = false
                Task { await uploadPhotos(datas) }
            }
        }
        .sheet(isPresented: .constant(previewUrl != nil)) {
            if let url = previewUrl {
                QuickLookPreview(url: url)
            }
        }
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            struct Req: APIRequest {
                typealias Response = [AttachmentRecord]
                let path: String
                let method: HTTPMethod = .get
            }
            let resp = try await api.send(Req(path: "/api/mobile/attachments?entity=\(entity)&entityId=\(entityId.uuidString)"))
            attachments = resp
        } catch {
            // Silently fail — attachments are non-critical.
        }
    }

    private func uploadPDF(images: [UIImage]) async {
        lastError = nil
        do {
            let uploader = AttachmentUploader(api: api)
            let record = try await uploader.uploadPDF(
                images: images,
                fileName: "scan_\(Date().ISO8601Format()).pdf",
                entity: entity,
                entityId: entityId
            )
            attachments.append(record)
        } catch {
            lastError = friendlyAttachmentError(error)
        }
    }

    private func uploadPhotos(_ datas: [Data]) async {
        lastError = nil
        let uploader = AttachmentUploader(api: api)
        for (index, data) in datas.enumerated() {
            do {
                let record = try await uploader.uploadImage(
                    data: data,
                    fileName: "photo_\(index)_\(Date().ISO8601Format()).jpg",
                    entity: entity,
                    entityId: entityId
                )
                attachments.append(record)
            } catch {
                lastError = friendlyAttachmentError(error)
            }
        }
    }

    private func delete(_ attachment: AttachmentRecord) {
        Task {
            lastError = nil
            do {
                struct Req: APIRequest {
                    typealias Response = EmptyResponse
                    let path: String
                    let method: HTTPMethod = .delete
                }
                _ = try await api.send(Req(path: "/api/mobile/attachments/\(attachment.id.uuidString)"))
                attachments.removeAll { $0.id == attachment.id }
            } catch {
                lastError = friendlyAttachmentError(error)
            }
        }
    }

    private func share(_ attachment: AttachmentRecord) {
        guard let url = URL(string: attachment.downloadUrl) else { return }
        let activity = UIActivityViewController(activityItems: [url], applicationActivities: nil)
        if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let root = scene.windows.first?.rootViewController {
            root.present(activity, animated: true)
        }
    }
}

/// Thumbnail view for an attachment.
private struct AttachmentThumbnail: View {
    let attachment: AttachmentRecord

    var body: some View {
        AsyncImage(url: URL(string: attachment.downloadUrl)) { phase in
            switch phase {
            case .empty:
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.gray.opacity(0.2))
                    .frame(width: 80, height: 80)
                    .overlay(ProgressView())
            case .success(let image):
                image
                    .resizable()
                    .scaledToFill()
                    .frame(width: 80, height: 80)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            case .failure:
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.gray.opacity(0.2))
                    .frame(width: 80, height: 80)
                    .overlay(Image(systemName: "doc"))
            @unknown default:
                EmptyView()
            }
        }
    }
}

/// QuickLook preview wrapper.
private struct QuickLookPreview: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> QLPreviewController {
        let controller = QLPreviewController()
        controller.dataSource = context.coordinator
        return controller
    }

    func updateUIViewController(_: QLPreviewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(url: url)
    }

    class Coordinator: NSObject, QLPreviewControllerDataSource {
        let url: URL

        init(url: URL) {
            self.url = url
        }

        func numberOfPreviewItems(in _: QLPreviewController) -> Int { 1 }

        func previewController(_: QLPreviewController, previewItemAt _: Int) -> QLPreviewItem {
            url as QLPreviewItem
        }
    }
}

/// Maps an APIError or NSError to a short user-readable Turkish string.
private func friendlyAttachmentError(_ error: Error) -> String {
    if case let APIError.http(status, _) = error {
        switch status {
        case 401: return "Oturum süresi doldu"
        case 403: return "Bu işleme yetkiniz yok"
        case 413: return "Dosya çok büyük (en fazla 20 MB)"
        default: return "Yükleme başarısız (kod \(status))"
        }
    }
    if let apiErr = error as? APIError, case .network = apiErr {
        return "İnternet bağlantısı yok"
    }
    return "Bir hata oluştu — lütfen tekrar deneyin"
}

private struct EmptyResponse: Codable {}
