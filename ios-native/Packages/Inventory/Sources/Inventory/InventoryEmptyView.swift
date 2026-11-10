import SwiftUI

public struct InventoryEmptyView: View {
    let isFiltered: Bool

    public init(isFiltered: Bool) {
        self.isFiltered = isFiltered
    }

    public var body: some View {
        ContentUnavailableView {
            Label(
                isFiltered ? "inventory.empty.filtered.title" : "inventory.empty.title",
                systemImage: isFiltered ? "magnifyingglass" : "shippingbox"
            )
        } description: {
            Text(isFiltered ? "inventory.empty.filtered.message" : "inventory.empty.message")
        } actions: {
            if !isFiltered {
                Text("inventory.empty.cta")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .accessibilityElement(children: .combine)
    }
}
