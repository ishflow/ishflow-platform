import AppShared
import SwiftUI

/// Bottom sheet that lets the user compose a draft `AdvancedFilters` and
/// apply it back to the inventory list. Mirrors `DocsFilterSheet` to keep
/// the cross-tab filter UX consistent.
struct InventoryAdvancedFilterSheet: View {
    @Binding var draft: InventoryListViewModel.AdvancedFilters
    let categories: [CatalogRecord]
    let groups: [CatalogRecord]
    let categoriesError: String?
    let groupsError: String?
    let onApply: (InventoryListViewModel.AdvancedFilters) -> Void
    let onReset: () -> Void

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    NavigationLink {
                        InventoryRefMultiPicker(
                            titleKey: "inventory.filter.category",
                            options: categories,
                            errorMessage: categoriesError,
                            selection: $draft.categoryIds
                        )
                    } label: {
                        rowLabel("inventory.filter.category", count: draft.categoryIds.count)
                    }
                    if let err = categoriesError {
                        Text(err)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                    NavigationLink {
                        InventoryRefMultiPicker(
                            titleKey: "inventory.filter.group",
                            options: groups,
                            errorMessage: groupsError,
                            selection: $draft.groupIds
                        )
                    } label: {
                        rowLabel("inventory.filter.group", count: draft.groupIds.count)
                    }
                    if let err = groupsError {
                        Text(err)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                }

                if !draft.isEmpty {
                    Section {
                        Button("common.reset", role: .destructive) {
                            draft = InventoryListViewModel.AdvancedFilters()
                            onReset()
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
            }
            .navigationTitle("inventory.filter.advanced.title")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("common.cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("common.apply") {
                        onApply(draft)
                        dismiss()
                    }
                    .bold()
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    @ViewBuilder
    private func rowLabel(_ titleKey: LocalizedStringKey, count: Int) -> some View {
        HStack {
            Text(titleKey)
            Spacer()
            if count > 0 {
                Text("\(count)")
                    .font(.caption.bold())
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(Capsule().fill(Color.accentColor))
                    .foregroundStyle(.white)
            } else {
                Text("inventory.filter.row.all")
                    .foregroundStyle(.secondary)
            }
        }
    }
}

/// Searchable multi-select picker for catalog refs (category / group).
/// Generic over any iterable of `CatalogRecord` from a single tenant —
/// no API call here, the parent owns fetching.
struct InventoryRefMultiPicker: View {
    let titleKey: LocalizedStringKey
    let options: [CatalogRecord]
    let errorMessage: String?
    @Binding var selection: Set<String>

    @State private var search: String = ""

    var body: some View {
        List {
            if let err = errorMessage {
                Section {
                    Text(err)
                        .font(.caption)
                        .foregroundStyle(.red)
                }
            }
            ForEach(filtered, id: \.id) { row in
                let key = row.id.uuidString.lowercased()
                Button {
                    toggle(key)
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(row.name).foregroundStyle(.primary)
                            if let code = row.code, !code.isEmpty {
                                Text(code).font(.caption).foregroundStyle(.secondary)
                            }
                        }
                        Spacer()
                        if selection.contains(key) {
                            Image(systemName: "checkmark").foregroundStyle(.tint)
                        }
                    }
                }
                .accessibilityIdentifier("inventory.filter.row.\(key)")
            }
            if options.isEmpty {
                Text("inventory.filter.empty")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .searchable(text: $search, prompt: Text("inventory.filter.search.prompt"))
        .navigationTitle(titleKey)
    }

    private var filtered: [CatalogRecord] {
        let trimmed = search.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !trimmed.isEmpty else { return options }
        return options.filter { r in
            r.name.lowercased().contains(trimmed)
                || (r.code?.lowercased().contains(trimmed) ?? false)
        }
    }

    private func toggle(_ id: String) {
        if selection.contains(id) {
            selection.remove(id)
        } else {
            selection.insert(id)
        }
    }
}
