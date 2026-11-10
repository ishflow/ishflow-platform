import AppShared
import SwiftUI

/// Profile screen showing real user data from the active session.
public struct ProfileView: View {
    @Environment(AppSession.self) private var session

    public init() {}

    public var body: some View {
        Form {
            if let user = session.user {
                Section {
                    HStack(spacing: 16) {
                        avatar(for: user)
                            .frame(width: 56, height: 56)
                            .clipShape(Circle())
                        VStack(alignment: .leading) {
                            Text(displayName(for: user)).font(.headline)
                            Text(user.email).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }

                Section {
                    LabeledContent("profile.email", value: user.email)
                    if let firstName = user.firstName {
                        LabeledContent("profile.firstName", value: firstName)
                    }
                    if let lastName = user.lastName {
                        LabeledContent("profile.lastName", value: lastName)
                    }
                    if let tenant = session.tenant {
                        LabeledContent("profile.organization", value: tenant.name)
                        LabeledContent("profile.currency", value: tenant.currency)
                    }
                }
            } else {
                ContentUnavailableView(
                    "profile.empty",
                    systemImage: "person.circle",
                    description: Text("profile.noData")
                )
            }
        }
        .navigationTitle("settings.profile")
    }

    @ViewBuilder
    private func avatar(for user: UserSummary) -> some View {
        if let url = user.imageUrl.flatMap(URL.init(string:)) {
            AsyncImage(url: url) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                Image(systemName: "person.circle.fill").resizable()
                    .foregroundStyle(.tertiary)
            }
        } else {
            Image(systemName: "person.circle.fill").resizable()
                .foregroundStyle(.tertiary)
        }
    }

    private func displayName(for user: UserSummary) -> String {
        let parts = [user.firstName, user.lastName].compactMap(\.self).filter { !$0.isEmpty }
        return parts.isEmpty ? user.email : parts.joined(separator: " ")
    }
}
