import Foundation

public extension Notification.Name {
    /// Posted by wizard posters after a document is successfully created or
    /// posted. List views observing this name reload so newly written
    /// documents appear without requiring a tab switch.
    static let ishflowDocumentsDidChange = Notification.Name("ishflow.documentsDidChange")
}
