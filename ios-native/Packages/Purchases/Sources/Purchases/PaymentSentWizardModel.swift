import AppShared
import Foundation
import Observation
import Sales

/// State container for the 3-step `purchases.payment_sent` creation wizard.
/// Holds the picked supplier plus the simple header (date / amount / comment);
/// owned by `PaymentSentWizardView` and shared with the supplier picker.
@Observable
@MainActor
public final class PaymentSentWizardModel {
    /// Wizard navigation step. Hashable so it can be pushed onto a
    /// `NavigationPath` via `navigationDestination(for:)`.
    public enum Step: Int, CaseIterable, Hashable, Sendable {
        /// Step 1 — supplier picker.
        case supplier
        /// Step 2 — header (date, amount, optional comment).
        case header
        /// Step 3 — link open invoices (optional).
        case linkInvoices
        /// Step 4 — review + post.
        case review
    }

    /// Currently active wizard step.
    public var step: Step = .supplier
    /// Picked supplier, if any. Set via `SupplierPickerSheet`.
    public var selectedSupplier: CatalogRecord?
    /// Header date defaults to now.
    public var date: Date = .now
    /// Amount paid to the supplier; required to be > 0 to advance past `.header`.
    public var amount: Decimal = 0
    /// Optional free-form note. Maps to the backend `note` field.
    public var comment: String = ""
    /// Linked invoice allocations, set via `OpenInvoicePicker`.
    public var linkedInvoices: [LinkedInvoice] = []
    /// Client-generated id used to bind attachments uploaded BEFORE the
    /// document exists. On document create, the server rebinds these
    /// attachments to the new document id (see `attachmentDraftId` POST field).
    public let draftAttachmentId: UUID = UUID()

    /// Create an empty wizard model.
    public init() {}

    /// Whether the user has supplied enough info to leave `step`.
    /// `.review` is the terminal step — advancing means submit, so it always returns true.
    public func canAdvance(from step: Step) -> Bool {
        switch step {
        case .supplier: selectedSupplier != nil
        case .header: amount > 0
        case .linkInvoices: true
        case .review: true
        }
    }
}
