import APIClient
import SwiftUI

/// Bottom sheet that lets the user compose a draft `AdvancedFilters` and
/// either Apply (commits the draft) or Reset/Cancel.
struct DocsFilterSheet: View {
    @Binding var draft: AdvancedFilters
    let api: any APIClient
    let onApply: (AdvancedFilters) -> Void
    let onReset: () -> Void

    @Environment(\.dismiss) private var dismiss

    /// Toggle for the optional date range. When false, dateFrom/dateTo are
    /// nil; when true the row exposes two date pickers seeded with today.
    @State private var datesEnabled: Bool = false
    @State private var localFrom: Date = .now
    @State private var localTo: Date = .now

    var body: some View {
        NavigationStack {
            Form {
                Section("docs.filter.dateRange") {
                    Toggle("docs.filter.dateRange.enable", isOn: $datesEnabled)
                    if datesEnabled {
                        DatePicker(
                            "docs.filter.dateFrom",
                            selection: $localFrom,
                            displayedComponents: .date
                        )
                        DatePicker(
                            "docs.filter.dateTo",
                            selection: $localTo,
                            displayedComponents: .date
                        )
                    }
                }

                Section {
                    NavigationLink {
                        DocsCustomerPicker(api: api, selection: $draft.customerIds)
                    } label: {
                        rowLabel(
                            title: "docs.filter.customer",
                            count: draft.customerIds.count
                        )
                    }
                    NavigationLink {
                        DocsSupplierPicker(api: api, selection: $draft.supplierIds)
                    } label: {
                        rowLabel(
                            title: "docs.filter.supplier",
                            count: draft.supplierIds.count
                        )
                    }
                    NavigationLink {
                        DocsProductPicker(api: api, selection: $draft.productIds)
                    } label: {
                        rowLabel(
                            title: "docs.filter.product",
                            count: draft.productIds.count
                        )
                    }
                }

                if !draft.isEmpty || datesEnabled {
                    Section {
                        Button("common.reset", role: .destructive) {
                            draft = AdvancedFilters()
                            datesEnabled = false
                            onReset()
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
            }
            .navigationTitle("docs.filter.title")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("common.cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("common.apply") {
                        if datesEnabled {
                            draft.dateFrom = localFrom
                            draft.dateTo = localTo
                        } else {
                            draft.dateFrom = nil
                            draft.dateTo = nil
                        }
                        onApply(draft)
                        dismiss()
                    }
                    .bold()
                }
            }
            .onAppear {
                // Seed the local date controls from the current draft so
                // re-opening the sheet shows what's already applied.
                if let from = draft.dateFrom {
                    localFrom = from
                    datesEnabled = true
                }
                if let to = draft.dateTo {
                    localTo = to
                    datesEnabled = true
                }
            }
        }
        .presentationDetents([.large])
    }

    @ViewBuilder
    private func rowLabel(title: LocalizedStringKey, count: Int) -> some View {
        HStack {
            Text(title)
            Spacer()
            if count > 0 {
                Text("\(count)")
                    .font(.caption.bold())
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(Capsule().fill(Color.accentColor))
                    .foregroundStyle(.white)
            } else {
                Text("docs.filter.row.all")
                    .foregroundStyle(.secondary)
            }
        }
    }
}
