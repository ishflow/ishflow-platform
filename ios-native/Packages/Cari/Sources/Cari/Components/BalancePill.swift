import AppShared
import Foundation
import SwiftUI

/// Right-aligned currency label tinted by `BalanceDirection`.
///
/// Renders the magnitude of an outstanding A/R or A/P balance in the
/// counterparty's currency, color-coded so the user can scan a list and
/// see who owes us (`.orange`) vs whom we owe (`.blue`) at a glance.
/// Net-zero balances fall back to `.secondary` so they read as neutral.
struct BalancePill: View {
    let balance: Decimal
    let direction: BalanceDirection
    let currency: String

    var body: some View {
        Text(balance, format: .currency(code: currency))
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(tint)
    }

    private var tint: Color {
        switch direction {
        case .owesUs: .orange
        case .weOwe: .blue
        case .zero: .secondary
        }
    }
}
