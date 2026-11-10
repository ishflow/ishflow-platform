import SwiftUI

/// Horizontal capsule-chip row that switches the active `DocsListView` filter.
///
/// Renders one chip per `DocsListViewModel.Filter` case (Tümü / Satış / Alış /
/// Tahsilat / Ödeme) inside a horizontal `ScrollView`. Tapping a chip mutates
/// the bound `selection` and fires `onChange`, so the parent view can kick off
/// `DocsListViewModel.load()`.
struct DocsFilterBar: View {
    @Binding var selection: DocsListViewModel.Filter
    let onChange: () -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(DocsListViewModel.Filter.allCases, id: \.self) { filter in
                    chip(for: filter)
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
        }
    }

    private func chip(for filter: DocsListViewModel.Filter) -> some View {
        let isSelected = filter == selection
        return Button {
            selection = filter
            onChange()
        } label: {
            Text(filter.titleKey)
                .font(.subheadline.weight(isSelected ? .semibold : .regular))
                .foregroundStyle(isSelected ? .white : .primary)
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(
                    Capsule().fill(isSelected ? Color.accentColor : Color.secondary.opacity(0.15))
                )
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("docs.filter.\(filter.rawIdentifier)")
    }
}

private extension DocsListViewModel.Filter {
    var titleKey: LocalizedStringKey {
        switch self {
        case .all: "docs.filter.all"
        case .sales: "docs.filter.sales"
        case .purchases: "docs.filter.purchases"
        }
    }

    var rawIdentifier: String {
        switch self {
        case .all: "all"
        case .sales: "sales"
        case .purchases: "purchases"
        }
    }
}
