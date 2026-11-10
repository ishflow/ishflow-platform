import AppShared
import Core
import SwiftUI

/// Turns a queued mutation into user-facing text. Raw endpoints
/// (`/api/mobile/documents/sales.invoice`), attempt counters, and `URLError`
/// dumps mean nothing to an end user, so the sync/offline screens render this
/// instead: a localized document name plus a plain-language status line.
enum QueuedMutationLabel {
    /// Localized document/operation name, e.g. "Satış faturası".
    /// Falls back to a generic "operation" label for non-document writes.
    static func title(_ snapshot: PendingMutationSnapshot) -> LocalizedStringKey {
        if let kind = documentKind(from: snapshot.endpoint) {
            return LocalizedStringKey(kind.titleKey)
        }
        return "syncItem.genericOperation"
    }

    /// Parses the document kind out of a `/api/mobile/documents/<type>[/...]`
    /// endpoint. Returns nil for endpoints that aren't document writes.
    private static func documentKind(from endpoint: String) -> DocumentKind? {
        let parts = endpoint.split(separator: "/").map(String.init)
        guard let index = parts.firstIndex(of: "documents"), index + 1 < parts.count else {
            return nil
        }
        return DocumentKind(rawValue: parts[index + 1])
    }
}
