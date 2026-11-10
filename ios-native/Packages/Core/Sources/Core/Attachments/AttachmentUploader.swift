import APIClient
import AppShared
import Foundation
import UIKit

/// Uploads images (as multi-page PDF) or photo data to R2 via signed URL.
public struct AttachmentUploader {
    private let api: any APIClient

    public init(api: any APIClient) {
        self.api = api
    }

    /// Converts images to a PDF and uploads.
    public func uploadPDF(
        images: [UIImage],
        fileName: String,
        entity: String,
        entityId: UUID
    ) async throws -> AttachmentRecord {
        let pdfData = try imagesToPDF(images)
        return try await upload(data: pdfData, fileName: fileName, mimeType: "application/pdf", entity: entity, entityId: entityId)
    }

    /// Uploads raw image data.
    public func uploadImage(
        data: Data,
        fileName: String,
        entity: String,
        entityId: UUID
    ) async throws -> AttachmentRecord {
        return try await upload(data: data, fileName: fileName, mimeType: "image/jpeg", entity: entity, entityId: entityId)
    }

    private func upload(
        data: Data,
        fileName: String,
        mimeType: String,
        entity: String,
        entityId: UUID
    ) async throws -> AttachmentRecord {
        struct UploadReq: APIRequest {
            typealias Response = UploadResponse
            let path = "/api/mobile/attachments/upload"
            let method: HTTPMethod = .post
            let body: (any Encodable & Sendable)?
        }
        struct UploadResponse: Codable {
            let attachmentId: UUID
            let uploadUrl: String
            let downloadUrl: String
        }
        struct Body: Codable, Sendable {
            let fileName: String
            let mimeType: String
            let size: Int
            let entity: String
            let entityId: UUID
        }

        let body = Body(fileName: fileName, mimeType: mimeType, size: data.count, entity: entity, entityId: entityId)
        let resp = try await api.send(UploadReq(body: body))

        guard let url = URL(string: resp.uploadUrl) else {
            throw URLError(.badURL)
        }
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue(mimeType, forHTTPHeaderField: "Content-Type")
        request.httpBody = data

        let (_, uploadResponse) = try await URLSession.shared.data(for: request)
        guard (uploadResponse as? HTTPURLResponse)?.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }

        return AttachmentRecord(
            id: resp.attachmentId,
            filename: fileName,
            contentType: mimeType,
            size: data.count,
            downloadUrl: resp.downloadUrl,
            createdAt: Date()
        )
    }

    private func imagesToPDF(_ images: [UIImage]) throws -> Data {
        let pdfRenderer = UIGraphicsPDFRenderer(bounds: CGRect(x: 0, y: 0, width: 612, height: 792))
        return pdfRenderer.pdfData { context in
            for image in images {
                context.beginPage()
                let rect = CGRect(x: 0, y: 0, width: 612, height: 792)
                image.draw(in: rect)
            }
        }
    }
}
