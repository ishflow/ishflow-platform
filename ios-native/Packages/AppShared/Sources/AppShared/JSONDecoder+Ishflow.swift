import Foundation

public extension JSONDecoder {
    /// Shared decoder configured for ishflow JSON payloads (ISO-8601 dates).
    ///
    /// Lives in AppShared so both APIClient and AppShared test targets
    /// reference the same single definition — no divergence risk.
    static let ishflow: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()
}
