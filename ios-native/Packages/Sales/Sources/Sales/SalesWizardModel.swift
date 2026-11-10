import AppShared
import Foundation
import Observation

/// DEBUG-only log — @autoclosure keeps PII/business strings out of release
/// builds. Finding G-iOS2.
private func dlog(_ message: @autoclosure () -> String) {
    #if DEBUG
    print(message())
    #endif
}

/// State container for the 3-step sales-invoice creation wizard.
/// Holds the picked customer, header date, and editable line items;
/// owned by `SalesWizardView` and shared with picker sheets.
@Observable
@MainActor
public final class SalesWizardModel {
    /// Wizard navigation step. Hashable so it can be pushed onto a
    /// `NavigationPath` via `navigationDestination(for:)`.
    public enum Step: Int, CaseIterable, Hashable, Sendable {
        /// Step 1 — customer picker.
        case customer
        /// Step 2 — header (date).
        case header
        /// Step 3 — line items.
        case lines
        /// Step 4 — review + post.
        case review
    }

    /// Editable line item describing one product, quantity, and unit price.
    public struct Line: Identifiable, Equatable {
        /// Stable identifier for SwiftUI list diffing.
        public let id = UUID()
        /// Product catalog record backing this line.
        public var product: CatalogRecord
        /// Quantity for the line.
        public var quantity: Decimal
        /// Unit price for the line.
        public var unitPrice: Decimal
        /// Computed line total `quantity * unitPrice`.
        public var total: Decimal {
            quantity * unitPrice
        }
    }

    /// Currently active wizard step.
    public var step: Step = .customer
    /// Picked customer, if any.
    public var customer: CatalogRecord?
    /// Header date defaults to now.
    public var date: Date = .now
    /// Picked warehouse, if any.
    public var warehouse: CatalogRecord?
    /// Picked price type, if any.
    public var priceType: CatalogRecord?
    /// Optional comment.
    public var comment: String = ""
    /// Editable lines.
    public var lines: [Line] = []
    /// Client-generated id used to bind attachments uploaded BEFORE the
    /// document exists. On document create, the server rebinds these
    /// attachments to the new document id (see `attachmentDraftId` POST field).
    public let draftAttachmentId: UUID = UUID()

    /// Create an empty wizard model.
    public init() {}

    /// Create a wizard model pre-seeded from an existing draft document.
    public convenience init(restoring document: DocumentRecord) {
        self.init()
        date = document.date
        if let customerRef = document.customer {
            customer = CatalogRecord(
                id: customerRef.id, code: customerRef.code, name: customerRef.name,
                createdAt: document.createdAt, updatedAt: document.updatedAt
            )
        }
        if let docLines = document.lines {
            lines = docLines.map { line in
                Line(
                    product: CatalogRecord(
                        id: line.productId, code: line.product?.code, name: line.product?.name ?? "",
                        createdAt: document.createdAt, updatedAt: document.updatedAt
                    ),
                    quantity: line.quantity.value,
                    unitPrice: line.unitPrice.value
                )
            }
        }
    }

    /// Append a new line backed by `product`. Quantity defaults to 0 so the
    /// in-form TextField shows its placeholder; the user types the real value.
    /// Posting validates quantity > 0.
    public func addLine(product: CatalogRecord, quantity: Decimal = 0, unitPrice: Decimal = 0) {
        lines.append(Line(product: product, quantity: quantity, unitPrice: unitPrice))
    }

    /// Append a line for `product`, resolving the unit price via `resolver`
    /// against `priceTypeId`. Falls back to `product.salePrice` (or 0) when
    /// the resolver returns nil. Errors are swallowed and treated as
    /// "no resolution" so a transient network blip doesn't block line entry.
    public func addLineResolvingPrice(
        product: CatalogRecord,
        priceTypeId: String?,
        resolver: PriceResolver,
        onError: ((Error) -> Void)? = nil
    ) async {
        dlog("[SalesWizard] addLineResolvingPrice product=\(product.id.uuidString.lowercased()) priceTypeId=\(priceTypeId ?? "nil")")
        var price: Decimal?
        if let priceTypeId, !priceTypeId.isEmpty {
            do {
                price = try await resolver.resolve(
                    productId: product.id.uuidString.lowercased(),
                    priceTypeId: priceTypeId
                )
            } catch {
                dlog("[SalesWizard] resolver threw: \(error)")
                onError?(error)
            }
        } else {
            dlog("[SalesWizard] no priceTypeId — skipping resolver")
        }
        let fallback = product.salePrice?.value ?? 0
        let final = price ?? fallback
        dlog("[SalesWizard] addLine unitPrice=\(final) (resolved=\(price?.description ?? "nil"), fallback=\(fallback))")
        addLine(product: product, quantity: 0, unitPrice: final)
    }

    /// Re-resolve every existing line's unit price against `priceTypeId`.
    /// Lines whose product has no resolved price keep their current
    /// unit price (preserves manual overrides). Use after the user changes
    /// price-type mid-wizard.
    public func reapplyPriceType(
        priceTypeId: String,
        resolver: PriceResolver
    ) async {
        for index in lines.indices {
            let productId = lines[index].product.id.uuidString.lowercased()
            do {
                if let resolved = try await resolver.resolve(
                    productId: productId,
                    priceTypeId: priceTypeId
                ) {
                    lines[index].unitPrice = resolved
                }
            } catch {
                dlog("[SalesWizard] reapplyPriceType error for product \(productId): \(error)")
            }
        }
    }

    /// Remove `line` from the editable list.
    public func removeLine(_ line: Line) {
        lines.removeAll { $0.id == line.id }
    }

    /// Whether the user has supplied enough info to leave `step`.
    public func canAdvance(from step: Step) -> Bool {
        switch step {
        case .customer: customer != nil
        case .header: true
        case .lines: !lines.isEmpty
        case .review: true
        }
    }
}
