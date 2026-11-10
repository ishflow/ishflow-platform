import APIClient
import AppShared
import Auth
import Core
import SwiftUI

/// Root settings screen with navigation links to sub-screens.
public struct SettingsRootView: View {
    @Environment(AppSession.self) private var session
    private let api: any APIClient
    private let fetchFailedMutations: () async -> [PendingMutationSnapshot]
    private let retryFailedMutation: (UUID) async -> Void

    public init(
        api: any APIClient,
        fetchFailedMutations: @escaping () async -> [PendingMutationSnapshot] = { [] },
        retryFailedMutation: @escaping (UUID) async -> Void = { _ in }
    ) {
        self.api = api
        self.fetchFailedMutations = fetchFailedMutations
        self.retryFailedMutation = retryFailedMutation
    }

    public var body: some View {
        NavigationStack {
            List {
                Section {
                    NavigationLink("settings.profile") { ProfileView() }
                }
                // BEGIN: stream-2-security
                SecuritySection()
                // END: stream-2-security
                Section {
                    NavigationLink {
                        LanguagePickerView()
                    } label: {
                        Label("settings.language.title", systemImage: "globe")
                    }
                    NavigationLink {
                        ThemePickerView()
                    } label: {
                        Label("settings.theme.title", systemImage: "paintbrush")
                    }
                    NavigationLink {
                        DashboardStylePickerView()
                    } label: {
                        Label("settings.dashboardStyle.title", systemImage: "rectangle.3.group")
                    }
                }
                // Billing is the owner's concern: other roles can neither see
                // the subscription nor act on it, so hide the entry entirely.
                if session.subscriptionFeatureVisible && isOwner {
                    Section {
                        NavigationLink {
                            BillingView(api: api)
                        } label: {
                            Label("billing.title", systemImage: "creditcard")
                        }
                    }
                }
            }
            .navigationTitle("settings.title")
        }
    }

    private var isOwner: Bool {
        session.memberships.first(where: \.isCurrent)?.primaryRole == "owner"
    }
}
