import SwiftUI

/// Header card for Customer 360: avatar (initials fallback), name, balance pill,
/// and action buttons for Call, Email, and Maps.
struct Customer360Header: View {
    let customer: Customer360Customer
    let balance: Double
    let currency: String

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                avatar
                VStack(alignment: .leading, spacing: 4) {
                    Text(customer.name)
                        .font(.title2.weight(.semibold))
                    if let code = customer.code {
                        Text(code)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                Spacer()
            }

            HStack {
                Text(balance, format: .currency(code: currency))
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(balance > 0 ? .orange : .secondary)
                Spacer()
            }

            HStack(spacing: 16) {
                if let phone = customer.phone, !phone.isEmpty {
                    Link(destination: URL(string: "tel:\(phone)")!) {
                        actionLabel(systemName: "phone.fill", text: "customer360.action.call")
                    }
                }
                if let email = customer.email, !email.isEmpty {
                    Link(destination: URL(string: "mailto:\(email)")!) {
                        actionLabel(systemName: "envelope.fill", text: "customer360.action.email")
                    }
                }
                if let address = customer.address, !address.isEmpty {
                    Link(destination: URL(string: "https://maps.apple.com/?q=\(address.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")")!) {
                        actionLabel(systemName: "map.fill", text: "customer360.action.maps")
                    }
                }
                Spacer()
            }
            .font(.subheadline)
        }
        .padding(.vertical, 4)
    }

    private var avatar: some View {
        Circle()
            .fill(Color.accentColor.opacity(0.15))
            .frame(width: 52, height: 52)
            .overlay(
                Text(initials)
                    .font(.title3.weight(.medium))
                    .foregroundStyle(.primary)
            )
    }

    private var initials: String {
        let parts = customer.name.split(separator: " ")
        let first = parts.first?.prefix(1) ?? ""
        let second = parts.count > 1 ? parts[1].prefix(1) : ""
        return String(first + second).uppercased()
    }

    private func actionLabel(systemName: String, text: LocalizedStringKey) -> some View {
        Label(text, systemImage: systemName)
            .foregroundStyle(.primary)
    }
}
