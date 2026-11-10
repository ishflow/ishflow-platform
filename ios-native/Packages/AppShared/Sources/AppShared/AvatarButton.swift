import SwiftUI

/// Circular avatar — initials fallback, async image when `user.imageUrl` is present.
public struct AvatarCircle: View {
    let user: UserSummary?
    let diameter: CGFloat

    public init(user: UserSummary?, diameter: CGFloat) {
        self.user = user
        self.diameter = diameter
    }

    public var body: some View {
        ZStack {
            Circle().fill(Color.accentColor.opacity(0.18))
            if let urlString = user?.imageUrl, let url = URL(string: urlString) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill()
                    default:
                        initials
                    }
                }
            } else {
                initials
            }
        }
        .frame(width: diameter, height: diameter)
        .clipShape(Circle())
    }

    private var initials: some View {
        Text(Self.initials(for: user))
            .font(.system(size: max(11, diameter * 0.4), weight: .semibold))
            .foregroundStyle(Color.accentColor)
    }

    public static func initials(for user: UserSummary?) -> String {
        guard let user else { return "?" }
        let first = user.firstName?.first.map(String.init) ?? ""
        let last  = user.lastName?.first.map(String.init) ?? ""
        let combined = (first + last).uppercased()
        if !combined.isEmpty { return combined }
        if let firstChar = user.email.first { return String(firstChar).uppercased() }
        return "?"
    }
}

/// Toolbar avatar button. Reads the active session from the environment so
/// the call site only supplies the tap action.
public struct AvatarButton: View {
    @Environment(AppSession.self) private var session
    let action: () -> Void

    public init(action: @escaping () -> Void) {
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            AvatarCircle(user: session.user, diameter: 32)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text("shell.avatar.label"))
    }
}
