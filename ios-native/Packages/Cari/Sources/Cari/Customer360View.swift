import APIClient
import AppShared
import Sales
import SwiftUI

/// Counterparty 360 detail view. Form-based layout that mirrors
/// `DocumentDetailContent`'s visual language: hero card, contact section,
/// activity sections (invoices + payments), and a bottom CTA. Works for
/// both customers and suppliers — the kind drives icon, accent color,
/// directional balance copy, and the action button label.
public struct Customer360View: View {
    private let api: any APIClient
    private let counterparty: Counterparty
    private let type: CounterpartyType
    @State private var viewModel: Customer360ViewModel?

    /// Create a Counterparty 360 screen bound to the given API client and counterparty.
    public init(
        api: any APIClient,
        counterparty: Counterparty,
        type: CounterpartyType = .customer
    ) {
        self.api = api
        self.counterparty = counterparty
        self.type = type
    }

    /// Test-only initializer that injects a pre-built view model.
    public init(
        api: any APIClient,
        counterparty: Counterparty,
        type: CounterpartyType,
        previewViewModel: Customer360ViewModel
    ) {
        self.api = api
        self.counterparty = counterparty
        self.type = type
        self._viewModel = State(initialValue: previewViewModel)
    }

    public var body: some View {
        Group {
            switch viewModel?.state {
            case .none, .idle, .loading:
                loadingView
            case let .failed(msg):
                ContentUnavailableView(
                    "customer360.error.title",
                    systemImage: "exclamationmark.triangle",
                    description: Text(LocalizedStringKey(msg))
                )
            case let .loaded(data):
                loadedView(data: data)
            }
        }
        .navigationTitle(counterparty.name)
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .refreshable { await viewModel?.refresh() }
        .task {
            if viewModel == nil {
                viewModel = Customer360ViewModel(
                    api: api,
                    customerId: counterparty.id.uuidString,
                    customerName: counterparty.name,
                    type: type
                )
            }
            await viewModel?.load()
        }
    }

    // MARK: - Loaded body

    @ViewBuilder
    private func loadedView(data: Customer360Response) -> some View {
        Form {
            heroSection(data: data)
            contactSection(data: data)
            invoicesSection(data: data)
            paymentsSection(data: data)
        }
    }

    @ViewBuilder
    private func heroSection(data: Customer360Response) -> some View {
        Section {
            VStack(spacing: 12) {
                Image(systemName: kindIcon)
                    .font(.system(size: 40, weight: .regular))
                    .foregroundStyle(kindColor)
                    .frame(width: 72, height: 72)
                    .background(Circle().fill(kindColor.opacity(0.12)))
                Text(data.counterparty.name)
                    .font(.title2.weight(.semibold))
                    .multilineTextAlignment(.center)
                if let code = data.counterparty.code, !code.isEmpty {
                    Text(code)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                balancePill(amount: data.balance, currency: data.currency)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .listRowBackground(Color.clear)
            .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
        }
    }

    @ViewBuilder
    private func contactSection(data: Customer360Response) -> some View {
        let phone = data.counterparty.phone ?? ""
        let email = data.counterparty.email ?? ""
        let address = data.counterparty.address ?? ""
        let hasAny = !phone.isEmpty || !email.isEmpty || !address.isEmpty
        if hasAny {
            Section("customer360.section.contact") {
                if !phone.isEmpty, let url = URL(string: "tel:\(phone)") {
                    Link(destination: url) {
                        Label(phone, systemImage: "phone.fill")
                            .foregroundStyle(.primary)
                    }
                }
                if !email.isEmpty, let url = URL(string: "mailto:\(email)") {
                    Link(destination: url) {
                        Label(email, systemImage: "envelope.fill")
                            .foregroundStyle(.primary)
                    }
                }
                if !address.isEmpty {
                    let encoded = address.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
                    if let url = URL(string: "https://maps.apple.com/?q=\(encoded)") {
                        Link(destination: url) {
                            Label(address, systemImage: "map.fill")
                                .foregroundStyle(.primary)
                        }
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func invoicesSection(data: Customer360Response) -> some View {
        Section("customer360.section.invoices") {
            if data.invoices.isEmpty {
                Text("customer360.invoices.empty.description")
                    .foregroundStyle(.secondary)
                    .font(.callout)
            } else {
                ForEach(data.invoices) { invoice in
                    invoiceRow(invoice, currency: data.currency)
                }
            }
        }
    }

    @ViewBuilder
    private func paymentsSection(data: Customer360Response) -> some View {
        Section("customer360.section.payments") {
            if data.payments.isEmpty {
                Text("customer360.payments.empty.description")
                    .foregroundStyle(.secondary)
                    .font(.callout)
            } else {
                ForEach(data.payments) { payment in
                    paymentRow(payment, currency: data.currency)
                }
            }
        }
    }

    @ViewBuilder
    private func invoiceRow(_ invoice: Customer360Invoice, currency: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(invoice.number)
                    .font(.body.weight(.medium))
                Spacer()
                Text(invoice.total, format: .currency(code: currency))
                    .font(.body.weight(.semibold))
                    .monospacedDigit()
            }
            HStack(spacing: 6) {
                if let date = ISO8601DateFormatter().date(from: invoice.date) {
                    Text(date, style: .date)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                statusPill(rawStatus: invoice.status)
            }
        }
        .padding(.vertical, 2)
    }

    @ViewBuilder
    private func paymentRow(_ payment: Customer360Payment, currency: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(payment.number)
                    .font(.body.weight(.medium))
                Spacer()
                Text(payment.amount, format: .currency(code: currency))
                    .font(.body.weight(.semibold))
                    .foregroundStyle(.green)
                    .monospacedDigit()
            }
            HStack(spacing: 6) {
                if let date = ISO8601DateFormatter().date(from: payment.date) {
                    Text(date, style: .date)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                statusPill(rawStatus: payment.status)
            }
        }
        .padding(.vertical, 2)
    }

    // MARK: - Bits

    @ViewBuilder
    private func balancePill(amount: Double, currency: String) -> some View {
        let direction = balanceDirection(for: amount)
        VStack(spacing: 2) {
            Text(abs(amount), format: .currency(code: currency))
                .font(.title3.weight(.semibold))
                .foregroundStyle(direction.color)
                .monospacedDigit()
            Text(direction.label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    @ViewBuilder
    private func statusPill(rawStatus: String) -> some View {
        let (label, color) = statusBadge(rawStatus: rawStatus)
        Text(label)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(Capsule().fill(color.opacity(0.18)))
            .foregroundStyle(color)
    }

    private func balanceDirection(for amount: Double) -> (label: LocalizedStringKey, color: Color) {
        // Customer A/R: positive = customer owes us (warning).
        // Supplier A/P: positive = we owe supplier (warning).
        if abs(amount) < 0.01 {
            return ("cari.row.balance.zero", .secondary)
        }
        switch type {
        case .customer:
            return amount > 0
                ? ("cari.row.balance.owesUs", .orange)
                : ("cari.row.balance.weOwe", .secondary)
        case .supplier:
            return amount > 0
                ? ("cari.row.balance.weOwe", .orange)
                : ("cari.row.balance.owesUs", .secondary)
        }
    }

    private func statusBadge(rawStatus: String) -> (LocalizedStringKey, Color) {
        switch rawStatus.uppercased() {
        case "POSTED":    return ("status.posted", .green)
        case "SAVED":     return ("status.saved", .blue)
        case "DRAFT":     return ("status.draft", .gray)
        case "CANCELLED": return ("status.cancelled", .red)
        default:          return (LocalizedStringKey(rawStatus), .secondary)
        }
    }

    private var kindIcon: String {
        switch type {
        case .customer: return "person.crop.circle.fill"
        case .supplier: return "shippingbox.fill"
        }
    }

    private var kindColor: Color {
        switch type {
        case .customer: return .green
        case .supplier: return .orange
        }
    }

    // MARK: - Loading placeholder

    @ViewBuilder
    private var loadingView: some View {
        Form {
            Section {
                VStack(spacing: 12) {
                    Circle().fill(Color.gray.opacity(0.2)).frame(width: 72, height: 72)
                    RoundedRectangle(cornerRadius: 4).fill(Color.gray.opacity(0.2)).frame(width: 160, height: 18)
                    RoundedRectangle(cornerRadius: 4).fill(Color.gray.opacity(0.2)).frame(width: 100, height: 12)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .listRowBackground(Color.clear)
            }
            ForEach(0 ..< 3, id: \.self) { _ in
                Section {
                    HStack {
                        RoundedRectangle(cornerRadius: 4).fill(Color.gray.opacity(0.2)).frame(width: 120, height: 14)
                        Spacer()
                        RoundedRectangle(cornerRadius: 4).fill(Color.gray.opacity(0.2)).frame(width: 60, height: 14)
                    }
                }
            }
        }
        .redacted(reason: .placeholder)
    }
}
