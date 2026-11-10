import CoreSpotlight
import UniformTypeIdentifiers
import Foundation

/// Indexes customers, products, and invoices into Core Spotlight so they
/// appear in iOS system search and Siri suggestions.
public struct SpotlightIndexer {
    private static let domain = "com.ishflow.app"

    /// Index a single customer.
    public static func indexCustomer(_ customer: Counterparty) {
        let item = CSSearchableItem(
            uniqueIdentifier: "customer:\(customer.id.uuidString)",
            domainIdentifier: domain,
            attributeSet: customerAttributeSet(customer)
        )
        CSSearchableIndex.default().indexSearchableItems([item]) { error in
            if let error { print("Spotlight index customer error: \(error)") }
        }
    }

    /// Index a single product.
    public static func indexProduct(_ product: CatalogRecord) {
        let item = CSSearchableItem(
            uniqueIdentifier: "product:\(product.id.uuidString)",
            domainIdentifier: domain,
            attributeSet: productAttributeSet(product)
        )
        CSSearchableIndex.default().indexSearchableItems([item]) { error in
            if let error { print("Spotlight index product error: \(error)") }
        }
    }

    /// Index a single invoice.
    public static func indexInvoice(_ invoice: DocumentRecord) {
        let item = CSSearchableItem(
            uniqueIdentifier: "invoice:\(invoice.id.uuidString)",
            domainIdentifier: domain,
            attributeSet: invoiceAttributeSet(invoice)
        )
        CSSearchableIndex.default().indexSearchableItems([item]) { error in
            if let error { print("Spotlight index invoice error: \(error)") }
        }
    }

    /// Remove all indexed items.
    public static func clearAll() {
        CSSearchableIndex.default().deleteAllSearchableItems()
    }

    private static func customerAttributeSet(_ customer: Counterparty) -> CSSearchableItemAttributeSet {
        let attrs = CSSearchableItemAttributeSet(contentType: .contact)
        attrs.title = customer.name
        attrs.displayName = customer.name
        attrs.contentDescription = customer.code ?? ""
        attrs.keywords = ["customer", "cari"]
        return attrs
    }

    private static func productAttributeSet(_ product: CatalogRecord) -> CSSearchableItemAttributeSet {
        let attrs = CSSearchableItemAttributeSet(contentType: .item)
        attrs.title = product.name
        attrs.displayName = product.name
        attrs.contentDescription = product.code ?? ""
        attrs.keywords = ["product", "inventory"]
        if let barcode = product.barcode {
            attrs.keywords?.append(barcode)
        }
        return attrs
    }

    private static func invoiceAttributeSet(_ invoice: DocumentRecord) -> CSSearchableItemAttributeSet {
        let attrs = CSSearchableItemAttributeSet(contentType: .item)
        attrs.title = invoice.number ?? "Invoice \(invoice.id.uuidString.prefix(8))"
        attrs.displayName = attrs.title
        attrs.contentDescription = "\(invoice.date) — \(invoice.total?.value.description ?? "")"
        attrs.keywords = ["invoice", "sales"]
        return attrs
    }
}
