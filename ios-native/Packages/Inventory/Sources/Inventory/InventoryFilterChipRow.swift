import SwiftUI

public struct InventoryFilterChipRow: View {
    @Binding var selection: InventoryListViewModel.InventoryFilter

    public init(selection: Binding<InventoryListViewModel.InventoryFilter>) {
        self._selection = selection
    }

    public var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(InventoryListViewModel.InventoryFilter.allCases) { f in
                    Button {
                        selection = f
                    } label: {
                        // Literal LocalizedStringKey per case. Building the
                        // key via runtime interpolation
                        // (`LocalizedStringKey("inventory.filter.\(rawValue)")`)
                        // sends SwiftUI through the package bundle, where the
                        // strings don't exist, and renders the humanized key
                        // ("Inventory filter in Stock"). Compile-time
                        // literals route through Bundle.main and resolve.
                        Text(titleKey(for: f))
                            .font(.subheadline)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(selection == f ? Color.accentColor : Color(.tertiarySystemFill))
                            .foregroundStyle(selection == f ? Color.white : Color.primary)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(Text(titleKey(for: f)))
                    .accessibilityAddTraits(selection == f ? .isSelected : [])
                }
            }
            .padding(.horizontal)
        }
    }

    private func titleKey(for filter: InventoryListViewModel.InventoryFilter) -> LocalizedStringKey {
        switch filter {
        case .all:      return "inventory.filter.all"
        case .inStock:  return "inventory.filter.inStock"
        case .lowStock: return "inventory.filter.lowStock"
        }
    }
}
