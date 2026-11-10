import Foundation

public actor PDFShareService {
    public static let shared = PDFShareService()
    private let session: URLSession

    init(session: URLSession = .shared) {
        self.session = session
    }

    /// Downloads the PDF for the given document and returns a temp-file URL ready for share sheet.
    public func downloadPDF(
        documentType: String,
        documentId: String,
        baseURL: URL,
        bearerToken: String
    ) async throws -> URL {
        let url = baseURL.appendingPathComponent("api/mobile/documents/\(documentType)/\(documentId)/pdf")
        var req = URLRequest(url: url)
        req.setValue("Bearer \(bearerToken)", forHTTPHeaderField: "Authorization")
        let (data, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw PDFShareError.requestFailed(
                statusCode: (response as? HTTPURLResponse)?.statusCode ?? -1
            )
        }
        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("\(documentType)-\(documentId).pdf")
        try data.write(to: tempURL, options: .atomic)
        return tempURL
    }
}

public enum PDFShareError: Error {
    case requestFailed(statusCode: Int)
}

extension PDFShareError: Equatable {}
