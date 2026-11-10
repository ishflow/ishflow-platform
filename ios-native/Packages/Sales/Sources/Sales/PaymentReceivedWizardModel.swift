import AppShared
import Foundation
import Observation

/// State container for the 3-step `sales.payment_received` creation wizard.
/// Holds the picked customer plus the simple header (date / amount / comment);
/// owned by `PaymentReceivedWizardView` and shared with the customer picker.
@Observable
@MainActor
public final class PaymentReceivedWizardModel {
    /// Wizard navigation step. Hashable so it can be pushed onto a
    /// `NavigationPath` via `navigationDestination(for:)`.
    public enum Step: Int, CaseIterable, Hashable, Sendable {
        /// Step 1 — customer picker.
        case customer
        /// Step 2 — header (date, amount, optional comment).
        case header
        /// Step 3 — link open invoices (optional).
        case linkInvoices
        /// Step 4 — review + post.
        case review
    }

    /// Currently active wizard step.
    public var step: Step = .customer
    /// Picked customer, if any. Set via `CustomerPickerSheet`.
    public var selectedCustomer: CatalogRecord?
    /// Header date defaults to now.
    public var date: Date = .now
    /// Amount paid by the customer; required to be > 0 to advance past `.header`.
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
        case .customer: selectedCustomer != nil
        case .header: amount > 0
        case .linkInvoices: true
        case .review: true
        }
    }
}
