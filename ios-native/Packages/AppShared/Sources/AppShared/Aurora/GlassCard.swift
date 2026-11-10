import SwiftUI

/// Frosted-glass container anchored to the bottom of an aurora screen. Holds the
/// headline, subtitle, CTAs and page dots. Translucent fill + saturated blur +
/// hairline border + soft drop shadow, matching the onboarding mockup (corner
/// radius 32, light/dark palettes).
public struct GlassCard<Content: View>: View {
    @Environment(\.colorScheme) private var colorScheme
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        let dark = colorScheme == .dark
        content
            .padding(.horizontal, 23)
            .padding(.vertical, 26)
            .background {
                RoundedRectangle(cornerRadius: 32, style: .continuous)
                    .fill(.ultraThinMaterial)
                    .overlay {
                        RoundedRectangle(cornerRadius: 32, style: .continuous)
                            .fill(dark
                                ? Color(red: 0.047, green: 0.071, blue: 0.118).opacity(0.5)
                                : Color.white.opacity(0.62))
                    }
                    .overlay {
                        RoundedRectangle(cornerRadius: 32, style: .continuous)
                            .strokeBorder(
                                dark ? Color.white.opacity(0.14) : Color.white.opacity(0.85),
                                lineWidth: 1
                            )
                    }
            }
            .shadow(color: .black.opacity(dark ? 0.34 : 0.18), radius: 26, x: 0, y: 18)
    }
}
