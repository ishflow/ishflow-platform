import AppShared
import SwiftUI

/// One row in the Cari list — counterparty name + balance pill.
///
/// Pairs the display name with a localized "owes us / we owe / settled"
/// caption and delegates the right-aligned currency rendering to
/// `BalancePill`.
struct CounterpartyRow: View {
    let counterparty: Counterparty

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(counterparty.name)
                    .font(.body.weight(.semibold))
                Text(directionLabel)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            BalancePill(
                balance: counterparty.balance.value,
                direction: counterparty.balanceDirection,
                currency: counterparty.currency
            )
        }
        .padding(.vertical, 6)
    }

    private var directionLabel: LocalizedStringKey {
        switch counterparty.balanceDirection {
        case .owesUs: "cari.row.balance.owesUs"
        case .weOwe: "cari.row.balance.weOwe"
        case .zero: "cari.row.balance.zero"
        }
    }
}
