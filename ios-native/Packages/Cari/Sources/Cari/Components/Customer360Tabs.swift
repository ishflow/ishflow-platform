import SwiftUI

/// Tabbed content for Customer 360: Invoices, Payments, Stock-out, Notes.
struct Customer360Tabs: View {
    let invoices: [Customer360Invoice]
    let payments: [Customer360Payment]
    let stockOuts: [Customer360StockOut]
    let currency: String

    var body: some View {
        TabView {
            invoiceTab
                .tabItem {
                    Label("customer360.tab.invoices", systemImage: "doc.text")
                }
            paymentTab
                .tabItem {
                    Label("customer360.tab.payments", systemImage: "creditcard")
                }
            stockOutTab
                .tabItem {
                    Label("customer360.tab.stockOuts", systemImage: "shippingbox")
                }
            notesTab
                .tabItem {
                    Label("customer360.tab.notes", systemImage: "note.text")
                }
        }
    }

    private var invoiceTab: some View {
        Group {
            if invoices.isEmpty {
                ContentUnavailableView(
                    "customer360.invoices.empty",
                    systemImage: "doc.text",
                    description: Text("customer360.invoices.empty.description")
                )
            } else {
                List(invoices) { invoice in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(invoice.number)
                                .font(.subheadline.weight(.semibold))
                            Spacer()
                            Text(invoice.total, format: .currency(code: currency))
                                .font(.subheadline)
                        }
                        if let date = ISO8601DateFormatter().date(from: invoice.date) {
                            Text(date, style: .date)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        if invoice.status == "POSTED" {
                            Text("customer360.status.posted")
                                .font(.caption2)
                                .foregroundStyle(.green)
                        } else {
                            Text("customer360.status.saved")
                                .font(.caption2)
                                .foregroundStyle(.orange)
                        }
                    }
                    .padding(.vertical, 2)
                }
            }
        }
    }

    private var paymentTab: some View {
        Group {
            if payments.isEmpty {
                ContentUnavailableView(
                    "customer360.payments.empty",
                    systemImage: "creditcard",
                    description: Text("customer360.payments.empty.description")
                )
            } else {
                List(payments) { payment in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(payment.number)
                                .font(.subheadline.weight(.semibold))
                            Spacer()
                            Text(payment.amount, format: .currency(code: currency))
                                .font(.subheadline)
                                .foregroundStyle(.green)
                        }
                        if let date = ISO8601DateFormatter().date(from: payment.date) {
                            Text(date, style: .date)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        if payment.status == "POSTED" {
                            Text("customer360.status.posted")
                                .font(.caption2)
                                .foregroundStyle(.green)
                        } else {
                            Text("customer360.status.saved")
                                .font(.caption2)
                                .foregroundStyle(.orange)
                        }
                    }
                    .padding(.vertical, 2)
                }
            }
        }
    }

    private var stockOutTab: some View {
        ContentUnavailableView(
            "customer360.stockOuts.empty",
            systemImage: "shippingbox",
            description: Text("customer360.stockOuts.empty.description")
        )
    }

    private var notesTab: some View {
        ContentUnavailableView(
            "customer360.notes.empty",
            systemImage: "note.text",
            description: Text("customer360.notes.empty.description")
        )
    }
}
