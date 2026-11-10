import AppShared
import Foundation
import Observation

/// State container for the 4-step `purchases.invoice` creation wizard.
/// Holds the picked supplier, the editable header (date / warehouse),
/// and the list of editable purchase lines; owned by
/// `PurchaseInvoiceWizardView` and shared with picker sheets.
///
/// Mirrors the shape of `SalesWizardModel` but follows the
/// `purchases.invoice` config exactly: there is no `priceType` and
/// no `note` on the header, and lines use `price` (not `unitPrice`).
@Observable
@MainActor
public final class PurchaseInvoiceWizardModel {
    /// Wizard navigation step. Hashable so it can be pushed onto a
    /// `NavigationPath` via `navigationDestination(for:)`.
    public enum Step: Int, CaseIterable, Hashable, Sendable {
        /// Step 1 — supplier picker.
        case supplier
        /// Step 2 — header (date + warehouse).
        case header
        /// Step 3 — line items.
        case lines
        /// Step 4 — review + post.
        case review
    }

    /// Editable line item describing one product, quantity, and unit price.
    /// `product` is optional so the user can append a blank line and pick the
    /// product inside the line editor sheet — `canAdvance(from: .lines)`
    /// rejects models that still contain a product-less line.
    public struct Line: Identifiable, Equatable {
        /// Stable identifier for SwiftUI list diffing.
        public let id: UUID
        /// Product catalog record backing this line, if picked.
        public var product: CatalogRecord?
        /// Quantity for the line.
        public var quantity: Decimal
        /// Unit price for the line. Maps to the wire field `price`.
        public var price: Decimal

        public init(
            id: UUID = UUID(),
            product: CatalogRecord? = nil,
            quantity: Decimal = 1,
            price: Decimal = 0
        ) {
            self.id = id
            self.product = product
            self.quantity = quantity
            self.price = price
        }

        /// Computed line total `quantity * price`.
        public var total: Decimal {
            quantity * price
        }
    }

    /// Currently active wizard step.
    public var step: Step = .supplier
    /// Picked supplier, if any. Set via `SupplierPickerSheet`.
    public var selectedSupplier: CatalogRecord?
    /// Picked warehouse, if any. Set via `WarehousePickerSheet`.
    public var selectedWarehouse: CatalogRecord?
    /// Header date defaults to now.
    public var date: Date = .now
    /// Editable lines.
    public var lines: [Line] = []
    /// Stable identifier used for pre-posting attachments.
    public let draftId: UUID

    /// Create an empty wizard model.
    public init(draftId: UUID = UUID()) {
        self.draftId = draftId
    }

    /// Append a new line backed by `product`. Quantity defaults to 0 so the
    /// in-form TextField shows its placeholder; user types the real value.
    public func addLine(product: CatalogRecord? = nil, quantity: Decimal = 0, price: Decimal = 0) {
        lines.append(Line(product: product, quantity: quantity, price: price))
    }

    /// Remove `line` from the editable list.
    public func removeLine(_ line: Line) {
        lines.removeAll { $0.id == line.id }
    }

    /// Whether the user has supplied enough info to leave `step`.
    /// `.review` is the terminal step — advancing means submit, so it always returns true.
    public func canAdvance(from step: Step) -> Bool {
        switch step {
        case .supplier:
            return selectedSupplier != nil
        case .header:
            return selectedWarehouse != nil
        case .lines:
            guard !lines.isEmpty else { return false }
            return lines.allSatisfy { $0.product != nil && $0.quantity > 0 && $0.price >= 0 }
        case .review:
            return true
        }
    }
}
