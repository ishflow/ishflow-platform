import AppShared
import SwiftUI

/// Dashboard checklist of the six onboarding setup steps. Each incomplete
/// actionable row taps into a `ishflow://` deep link; the caller passes a
/// closure to forward those URLs into the app's deep-link router. The widget
/// hides itself once `viewModel.isVisible` reports `false`.
@MainActor
public struct SetupProgressWidget: View {
    @Bindable var viewModel: SetupProgressViewModel
    private let onDeepLink: ((URL) -> Void)?

    public init(viewModel: SetupProgressViewModel, onDeepLink: ((URL) -> Void)? = nil) {
        self.viewModel = viewModel
        self.onDeepLink = onDeepLink
    }

    public var body: some View {
        if viewModel.isVisible {
            GroupBox {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(viewModel.rows) { row in
                        if let path = row.deepLinkPath, !row.isComplete {
                            Button {
                                if let url = URL(string: "ishflow://\(path)") {
                                    onDeepLink?(url)
                                }
                            } label: {
                                rowContent(row)
                            }
                            .buttonStyle(.plain)
                        } else {
                            rowContent(row)
                        }
                    }
                    Divider()
                    Button {
                        viewModel.hideForOneWeek()
                    } label: {
                        Text("onboarding.setupProgress.hideForNow")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                }
            } label: {
                Label("onboarding.setupProgress.title", systemImage: "checklist")
                    .font(.headline)
            }
            .padding(.horizontal)
        }
    }

    private func rowContent(_ row: SetupProgressRow) -> some View {
        LabeledContent {
            EmptyView()
        } label: {
            Label {
                Text(LocalizedStringKey(row.titleKey))
                    .strikethrough(row.isComplete, color: .secondary)
                    .foregroundStyle(row.isComplete ? .secondary : .primary)
            } icon: {
                Image(systemName: row.isComplete ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(row.isComplete ? .green : .secondary)
            }
        }
    }
}
