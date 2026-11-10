import SwiftUI

/// Brand colours shared by the aurora onboarding chrome.
public enum AuroraPalette {
    /// #0F5EEF — primary brand blue.
    public static let blue = Color(red: 0.059, green: 0.369, blue: 0.937)
    /// #B0E9FD — cyan highlight.
    public static let cyan = Color(red: 0.690, green: 0.914, blue: 0.992)
}

/// Primary pill CTA. On dark it is a white capsule with dark text (matching the
/// mockup's inverted button); on light it is a brand-blue capsule with white
/// text. 53pt tall, fully rounded, soft shadow.
public struct AuroraPrimaryButtonStyle: ButtonStyle {
    @Environment(\.colorScheme) private var colorScheme

    public init() {}

    public func makeBody(configuration: Configuration) -> some View {
        let dark = colorScheme == .dark
        configuration.label
            .font(.system(size: 17, weight: .semibold))
            .foregroundStyle(dark ? Color(red: 0.039, green: 0.078, blue: 0.149) : Color.white)
            .frame(maxWidth: .infinity, minHeight: 53)
            .background(
                Capsule(style: .continuous)
                    .fill(dark ? Color.white : AuroraPalette.blue)
            )
            .shadow(
                color: dark ? .black.opacity(0.22) : AuroraPalette.blue.opacity(0.42),
                radius: 14, x: 0, y: 12
            )
            .opacity(configuration.isPressed ? 0.85 : 1)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

/// Apple-styled CTA used for the "Sign in with Apple" surface: black capsule
/// with white content on light, near-black with hairline border on dark. 53pt.
public struct AuroraAppleButtonStyle: ButtonStyle {
    @Environment(\.colorScheme) private var colorScheme

    public init() {}

    public func makeBody(configuration: Configuration) -> some View {
        let dark = colorScheme == .dark
        configuration.label
            .font(.system(size: 17, weight: .semibold))
            .foregroundStyle(Color.white)
            .frame(maxWidth: .infinity, minHeight: 53)
            .background(
                Capsule(style: .continuous)
                    .fill(dark ? Color.black : Color(red: 0.039, green: 0.078, blue: 0.149))
                    .overlay {
                        if dark {
                            Capsule(style: .continuous)
                                .strokeBorder(Color.white.opacity(0.18), lineWidth: 1)
                        }
                    }
            )
            .opacity(configuration.isPressed ? 0.85 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

/// Ghost / secondary pill CTA: transparent fill with a brand-tinted border and
/// label. Used for "start empty" style declines. 53pt.
public struct AuroraGhostButtonStyle: ButtonStyle {
    @Environment(\.colorScheme) private var colorScheme

    public init() {}

    public func makeBody(configuration: Configuration) -> some View {
        let dark = colorScheme == .dark
        configuration.label
            .font(.system(size: 17, weight: .semibold))
            .foregroundStyle(dark ? Color.white : Color(red: 0.051, green: 0.227, blue: 0.541))
            .frame(maxWidth: .infinity, minHeight: 53)
            .background(
                Capsule(style: .continuous)
                    .fill(dark ? Color.clear : AuroraPalette.blue.opacity(0.05))
                    .overlay {
                        Capsule(style: .continuous)
                            .strokeBorder(
                                dark ? Color.white.opacity(0.4) : AuroraPalette.blue.opacity(0.3),
                                lineWidth: 1
                            )
                    }
            )
            .opacity(configuration.isPressed ? 0.8 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

/// Capsule "feature pill" (page 1 of the welcome carousel): a small checkmark +
/// label chip on a translucent brand-tinted background.
public struct AuroraFeaturePill: View {
    @Environment(\.colorScheme) private var colorScheme
    private let titleKey: LocalizedStringKey

    public init(_ titleKey: LocalizedStringKey) {
        self.titleKey = titleKey
    }

    public var body: some View {
        let dark = colorScheme == .dark
        HStack(spacing: 6) {
            Image(systemName: "checkmark")
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(dark ? Color.white : AuroraPalette.blue)
            Text(titleKey)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(dark ? Color.white : Color(red: 0.051, green: 0.227, blue: 0.541))
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 7)
        .background(
            Capsule(style: .continuous)
                .fill(dark ? Color.white.opacity(0.12) : AuroraPalette.blue.opacity(0.10))
                .overlay {
                    Capsule(style: .continuous)
                        .strokeBorder(
                            dark ? Color.white.opacity(0.2) : AuroraPalette.blue.opacity(0.22),
                            lineWidth: 1
                        )
                }
        )
    }
}

/// Page-indicator dots that match the mockup: inactive dots are small and
/// muted, the active dot widens into a pill (brand-blue on light, white on
/// dark).
public struct AuroraPageDots: View {
    @Environment(\.colorScheme) private var colorScheme
    private let count: Int
    private let activeIndex: Int

    public init(count: Int, activeIndex: Int) {
        self.count = count
        self.activeIndex = activeIndex
    }

    public var body: some View {
        let dark = colorScheme == .dark
        HStack(spacing: 7) {
            ForEach(0 ..< count, id: \.self) { index in
                let isOn = index == activeIndex
                Capsule(style: .continuous)
                    .fill(dotColor(isOn: isOn, dark: dark))
                    .frame(width: isOn ? 24 : 7, height: 7)
                    .animation(.easeOut(duration: 0.25), value: activeIndex)
            }
        }
    }

    private func dotColor(isOn: Bool, dark: Bool) -> Color {
        if isOn {
            return dark ? Color.white : AuroraPalette.blue
        }
        return dark ? Color.white.opacity(0.4) : Color(red: 0.078, green: 0.216, blue: 0.471).opacity(0.28)
    }
}
