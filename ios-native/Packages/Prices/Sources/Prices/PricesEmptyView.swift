import SwiftUI

public struct PricesEmptyView: View {
    let isFiltered: Bool

    public init(isFiltered: Bool) {
        self.isFiltered = isFiltered
    }

    public var body: some View {
        ContentUnavailableView {
            Label(
                isFiltered ? "prices.empty.filtered.title" : "prices.empty.title",
                systemImage: isFiltered ? "magnifyingglass" : "tag"
            )
        } description: {
            Text(isFiltered ? "prices.empty.filtered.message" : "prices.empty.description")
        }
        .accessibilityElement(children: .combine)
    }
}
