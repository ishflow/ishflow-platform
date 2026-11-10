import APIClient
import AppShared
import SwiftUI

/// Billing screen (owner-only): prominent current-plan card, trial status,
/// usage strip with unlimited-aware rows, and upgrade/manage actions that
/// continue in the system browser on the web app.
public struct BillingView: View {
    @State private var viewModel: BillingViewModel
    @Environment(\.openURL) private var openURL
    @AppStorage("appLocale") private var localeCode: String = "ru"

    /// Construct the view with an injected `APIClient`.
    public init(api: any APIClient) {
        _viewModel = State(initialValue: BillingViewModel(api: api))
    }

    public var body: some View {
        List {
            switch viewModel.state {
            case .idle, .loading:
                Section {
                    HStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                }
            case let .failed(message):
                Section {
                    Label(message, systemImage: "exclamationmark.triangle")
                        .foregroundStyle(.red)
                    Button {
                        Task { await viewModel.load() }
                    } label: {
                        Text("billing.retry")
                    }
                }
            case let .ready(snapshot):
                planSection(snapshot)
                if let days = viewModel.trialDaysLeft, days <= 3 {
                    trialBanner(days: days)
                }
                usageSection(snapshot)
                actionsSection(snapshot)
            }
        }
        .navigationTitle("billing.title")
        .task {
            if case .idle = viewModel.state {
                await viewModel.load()
            }
        }
    }

    // MARK: - Sections

    @ViewBuilder
    private func planSection(_ snapshot: BillingResponse) -> some View {
        Section {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Label("billing.currentPlan", systemImage: "crown.fill")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Spacer()
                    statusBadge(snapshot.status)
                }
                Text(planLabel(snapshot.plan))
                    .font(.title2.weight(.semibold))
            }
            .padding(.vertical, 4)
        }
    }

    @ViewBuilder
    private func statusBadge(_ status: BillingResponse.Status) -> some View {
        Text(statusLabel(status))
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(
                Capsule().fill(status == .active ? Color.green.opacity(0.15) : Color.orange.opacity(0.15))
            )
            .foregroundStyle(status == .active ? Color.green : Color.orange)
    }

    @ViewBuilder
    private func trialBanner(days: Int) -> some View {
        Section {
            Label {
                Text("billing.trial.endsIn \(days)")
            } icon: {
                Image(systemName: "hourglass")
            }
            .foregroundStyle(.orange)
        }
    }

    @ViewBuilder
    private func usageSection(_ snapshot: BillingResponse) -> some View {
        Section("billing.usage.title") {
            usageRow(
                label: LocalizedStringKey("billing.usage.members"),
                used: snapshot.usage.members,
                limit: snapshot.limits.members
            )
            usageRow(
                label: LocalizedStringKey("billing.usage.documents"),
                used: snapshot.usage.monthlyPostedDocs,
                limit: snapshot.limits.monthlyPostedDocs
            )
            usageRow(
                label: LocalizedStringKey("billing.usage.storage"),
                used: snapshot.usage.storageBytes,
                limit: snapshot.limits.storageBytes,
                formatter: BillingFormat.byteCount
            )
        }
    }

    @ViewBuilder
    private func actionsSection(_ snapshot: BillingResponse) -> some View {
        if snapshot.paymentsEnabled {
            Section {
                Button {
                    Task {
                        if let url = await viewModel.openManageOnWeb() {
                            openURL(url)
                        }
                    }
                } label: {
                    HStack {
                        Text("billing.manage")
                        Spacer()
                        if viewModel.openingHandoff {
                            ProgressView()
                        }
                    }
                }
                .disabled(viewModel.openingHandoff)

                if snapshot.plan == .free {
                    Button {
                        Task {
                            if let url = await viewModel.openSeePlans(targetPlan: nil) {
                                openURL(url)
                            }
                        }
                    } label: {
                        Text("billing.seePlans")
                    }
                    .disabled(viewModel.openingHandoff)
                }
            }
        } else {
            // Payments are not wired for this deployment: hand the user off to
            // the web billing page in the system browser instead.
            Section {
                Button {
                    if let url = URL(string: "https://ishflow.com/\(localeCode)/settings/billing") {
                        openURL(url)
                    }
                } label: {
                    HStack {
                        Label("billing.upgradeOnWeb", systemImage: "arrow.up.forward.app")
                        Spacer()
                        Image(systemName: "safari")
                            .foregroundStyle(.secondary)
                    }
                }
            } footer: {
                Text("billing.upgradeOnWebFooter")
            }
        }
    }

    // MARK: - Helpers

    @ViewBuilder
    private func usageRow(
        label: LocalizedStringKey,
        used: Int,
        limit: Int,
        formatter: (Int) -> String = { String($0) }
    ) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(label)
                Spacer()
                if BillingFormat.isUnlimited(limit) {
                    // Unlimited plans: show usage + ∞, no meaningless progress bar.
                    Text("\(formatter(used)) / ∞")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else {
                    Text("\(formatter(used)) / \(formatter(limit))")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            if !BillingFormat.isUnlimited(limit) {
                ProgressView(value: progressValue(used: used, limit: limit))
            }
        }
    }

    private func progressValue(used: Int, limit: Int) -> Double {
        guard limit > 0 else { return 0 }
        return min(1.0, Double(used) / Double(limit))
    }

    private func planLabel(_ plan: BillingResponse.Plan) -> String {
        plan.rawValue.capitalized
    }

    private func statusLabel(_ status: BillingResponse.Status) -> String {
        status.rawValue.replacingOccurrences(of: "_", with: " ").capitalized
    }
}
