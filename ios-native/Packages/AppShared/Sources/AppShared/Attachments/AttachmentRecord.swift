import Foundation

/// Represents an attachment returned by the mobile API.
public struct AttachmentRecord: Codable, Sendable, Identifiable {
    public let id: UUID
    public let filename: String
    public let contentType: String
    public let size: Int
    public let downloadUrl: String
    public let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case filename
        case contentType
        case size
        case downloadUrl
        case createdAt
    }

    public init(
        id: UUID,
        filename: String,
        contentType: String,
        size: Int,
        downloadUrl: String,
        createdAt: Date
    ) {
        self.id = id
        self.filename = filename
        self.contentType = contentType
        self.size = size
        self.downloadUrl = downloadUrl
        self.createdAt = createdAt
    }
}
