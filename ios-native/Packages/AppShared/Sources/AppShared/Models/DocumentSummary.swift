import Foundation

/// Backend-known document kinds, keyed by their canonical type slug.
public enum DocumentKind: String, Codable, Sendable, CaseIterable {
    case salesInvoice = "sales.invoice"
    case salesPaymentReceived = "sales.payment_received"
    case purchaseInvoice = "purchases.invoice"
    case purchasePaymentSent = "purchases.payment_sent"

    /// Message-catalog key for this kind's human-readable name
    /// (e.g. "Satış faturası"). Resolved against the app bundle.
    public var titleKey: String {
        switch self {
        case .salesInvoice: "docs.detail.kind.salesInvoice"
        case .salesPaymentReceived: "docs.detail.kind.paymentReceived"
        case .purchaseInvoice: "docs.detail.kind.purchaseInvoice"
        case .purchasePaymentSent: "docs.detail.kind.paymentSent"
        }
    }
}

/// Lightweight presentation-friendly view of a document for use in
/// heterogeneous lists like the Docs tab. Built from a `DocumentRecord`
/// + the document's known kind.
public struct DocumentSummary: Sendable, Equatable, Identifiable {
    public let id: UUID
    public let kind: DocumentKind
    public let displayNumber: String
    public let date: Date
    public let counterpartyName: String?
    public let amount: DecimalString?
    public let currency: String?
    public let status: DocumentStatus

    public init(
        id: UUID,
        kind: DocumentKind,
        displayNumber: String,
        date: Date,
        counterpartyName: String?,
        amount: DecimalString?,
        currency: String?,
        status: DocumentStatus
    ) {
        self.id = id
        self.kind = kind
        self.displayNumber = displayNumber
        self.date = date
        self.counterpartyName = counterpartyName
        self.amount = amount
        self.currency = currency
        self.status = status
    }
}

public extension DocumentSummary {
    /// Build a summary from a `DocumentRecord` of a known kind. The kind
    /// must come from the caller because `DocumentRecord` does not carry
    /// it on the wire.
    static func from(
        record: DocumentRecord,
        kind: DocumentKind,
        tenantCurrency: String
    ) -> DocumentSummary {
        DocumentSummary(
            id: record.id,
            kind: kind,
            displayNumber: record.number,
            date: record.date,
            counterpartyName: record.customer?.name ?? record.supplier?.name,
            amount: record.total,
            currency: tenantCurrency,
            status: record.status
        )
    }
}
