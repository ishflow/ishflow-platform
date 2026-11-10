import SwiftUI

/// Closure invoked when the top-leading avatar is tapped on a root tab.
/// `MainTabView` injects the value; root views read it via `.rootToolbar()`.
private struct RootAvatarTapKey: EnvironmentKey {
    nonisolated(unsafe) static let defaultValue: () -> Void = {}
}

/// Closure invoked when the user picks a different tenant from the
/// in-app organization switcher. Takes the target tenantId. The
/// implementation calls `POST /api/mobile/tenants/:id/switch`, replaces
/// the stored bearer, and re-bootstraps the app.
private struct TenantSwitchKey: EnvironmentKey {
    nonisolated(unsafe) static let defaultValue: @Sendable (String) async -> Void = { _ in }
}

extension EnvironmentValues {
    public var rootAvatarTap: () -> Void {
        get { self[RootAvatarTapKey.self] }
        set { self[RootAvatarTapKey.self] = newValue }
    }

    public var tenantSwitch: @Sendable (String) async -> Void {
        get { self[TenantSwitchKey.self] }
        set { self[TenantSwitchKey.self] = newValue }
    }
}

extension View {
    /// Attach the shared top-leading avatar button. Place INSIDE the existing
    /// `NavigationStack` of each root tab view (does NOT add a new stack).
    public func rootToolbar() -> some View {
        modifier(RootToolbarModifier())
    }
}

private struct RootToolbarModifier: ViewModifier {
    @Environment(\.rootAvatarTap) private var avatarTap

    func body(content: Content) -> some View {
        content.toolbar {
            ToolbarItem(placement: .topBarLeading) {
                AvatarButton(action: avatarTap)
            }
            // Drop iOS 26's circular glass background so the avatar shows
            // bare (no white capsule around it).
            .sharedBackgroundVisibility(.hidden)
        }
    }
}
