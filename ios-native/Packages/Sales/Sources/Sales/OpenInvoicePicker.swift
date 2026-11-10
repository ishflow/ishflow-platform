import APIClient
import AppShared
import SwiftUI

/// Direction for open-invoice queries.
public enum OpenInvoiceDirection: String, Sendable {
    case receivable
    case payable
}

/// Represents a single linked invoice allocation.
public struct LinkedInvoice: Sendable {
    public let invoiceId: UUID
    public let amount: Decimal

    public init(invoiceId: UUID, amount: Decimal) {
        self.invoiceId = invoiceId
        self.amount = amount
    }
}

/// Row model for the open-invoice picker list.
@MainActor
struct OpenInvoiceRow: Identifiable {
    let id = UUID()
    let invoiceId: UUID
    let documentType: String
    let invoiceNumber: String
    let invoiceDate: Date
    let totalAmount: Decimal
    let paidAmount: Decimal
    let openAmount: Decimal
    let currency: String
    var selected: Bool
    var allocated: Decimal
}

/// Multi-select picker for open invoices with per-row amount allocation.
public struct OpenInvoicePicker: View {
    public let counterpartyId: UUID
    public let direction: OpenInvoiceDirection
    public let totalToAllocate: Decimal
    public let onConfirm: ([LinkedInvoice]) -> Void

    @State private var rows: [OpenInvoiceRow] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var api: any APIClient

    private let epsilon: Decimal = 0.01

    /// Creates a picker bound to the given API client.
    public init(
        api: any APIClient,
        counterpartyId: UUID,
        direction: OpenInvoiceDirection,
        totalToAllocate: Decimal,
        onConfirm: @escaping ([LinkedInvoice]) -> Void
    ) {
        self.api = api
        self.counterpartyId = counterpartyId
        self.direction = direction
        self.totalToAllocate = totalToAllocate
        self.onConfirm = onConfirm
    }

    public var body: some View {
        VStack(spacing: 0) {
            List {
                if isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, alignment: .center)
                } else if let error = errorMessage {
                    Text(error)
                        .foregroundStyle(.red)
                        .font(.caption)
                } else if rows.isEmpty {
                    Text("payment.linkInvoices.empty")
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .center)
                } else {
                    ForEach($rows) { $row in
                        OpenInvoiceRowView(
                            row: $row,
                            totalToAllocate: totalToAllocate,
                            remainingTotal: remainingTotal
                        )
                    }
                }
            }

            Divider()

            VStack(spacing: 8) {
                HStack {
                    Text("payment.linkInvoices.allocated")
                    Spacer()
                    Text(formattedCurrency(allocatedTotal))
                        .fontWeight(.semibold)
                }
                HStack {
                    Text("payment.linkInvoices.remaining")
                    Spacer()
                    Text(formattedCurrency(remainingTotal))
                        .fontWeight(.semibold)
                        .foregroundStyle(remainingTotal < -epsilon ? .red : .primary)
                }
                Button {
                    confirm()
                } label: {
                    Text("payment.linkInvoices.confirm")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .disabled(!canConfirm)
            }
            .padding()
        }
        .navigationTitle("payment.linkInvoices.title")
        .task {
            await loadRows()
        }
    }

    private var allocatedTotal: Decimal {
        rows.reduce(0) { $0 + ($1.selected ? $1.allocated : 0) }
    }

    private var remainingTotal: Decimal {
        totalToAllocate - allocatedTotal
    }

    private var canConfirm: Bool {
        abs(allocatedTotal - totalToAllocate) <= epsilon && allocatedTotal > 0
    }

    private func formattedCurrency(_ value: Decimal) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = rows.first?.currency ?? "USD"
        return formatter.string(from: value as NSNumber) ?? String(describing: value)
    }

    private func loadRows() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let request = OpenInvoicesRequest(
                counterpartyId: counterpartyId.uuidString,
                direction: direction.rawValue
            )
            let response = try await api.send(request)
            rows = response.items.map { item in
                let openAmount = Decimal(item.openAmount)
                return OpenInvoiceRow(
                    invoiceId: UUID(uuidString: item.invoiceId) ?? UUID(),
                    documentType: item.documentType,
                    invoiceNumber: item.invoiceNumber,
                    invoiceDate: ISO8601DateFormatter().date(from: item.invoiceDate) ?? Date(),
                    totalAmount: Decimal(item.totalAmount),
                    paidAmount: Decimal(item.paidAmount),
                    openAmount: openAmount,
                    currency: item.currency,
                    selected: false,
                    allocated: 0
                )
            }
        } catch {
            errorMessage = String(describing: error)
        }
    }

    private func confirm() {
        let linked = rows
            .filter { $0.selected && $0.allocated > 0 }
            .map { LinkedInvoice(invoiceId: $0.invoiceId, amount: $0.allocated) }
        onConfirm(linked)
    }
}

// MARK: - Subviews

@MainActor
struct OpenInvoiceRowView: View {
    @Binding var row: OpenInvoiceRow
    let totalToAllocate: Decimal
    let remainingTotal: Decimal

    var body: some View {
        HStack(spacing: 12) {
            Button {
                row.selected.toggle()
                if row.selected {
                    let defaultAmount = min(row.openAmount, max(remainingTotal + row.allocated, 0))
                    row.allocated = defaultAmount > 0 ? defaultAmount : 0
                } else {
                    row.allocated = 0
                }
            } label: {
                Image(systemName: row.selected ? "checkmark.square.fill" : "square")
                    .foregroundStyle(Color.accentColor)
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 4) {
                Text(row.invoiceNumber)
                    .font(.headline)
                Text(row.invoiceDate, style: .date)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text("Open: \(row.openAmount)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            if row.selected {
                TextField("Amount", value: $row.allocated, format: .number)
                    .keyboardType(.decimalPad)
                    .multilineTextAlignment(.trailing)
                    .frame(width: 80)
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - API Types

struct OpenInvoicesRequest: APIRequest {
    typealias Response = OpenInvoicesResponse
    let path = "/api/mobile/payments/open-invoices"
    let method: HTTPMethod = .get
    let query: [String: String]?

    init(counterpartyId: String, direction: String) {
        self.query = [
            "counterpartyId": counterpartyId,
            "direction": direction,
        ]
    }
}

struct OpenInvoicesResponse: Decodable {
    let items: [OpenInvoiceItem]
}

struct OpenInvoiceItem: Decodable {
    let invoiceId: String
    let documentType: String
    let invoiceNumber: String
    let invoiceDate: String
    let totalAmount: Double
    let paidAmount: Double
    let openAmount: Double
    let currency: String
}
