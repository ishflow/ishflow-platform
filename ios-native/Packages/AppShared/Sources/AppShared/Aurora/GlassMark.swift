import SwiftUI

/// Translucent 66pt rounded-square "glass mark" tile that floats above the
/// `GlassCard`, holding a stroked SF Symbol glyph. Matches the mockup's frosted
/// icon chip (blurred fill, hairline border, soft shadow). The glyph tints
/// white on dark and brand-blue on light.
public struct GlassMark: View {
    @Environment(\.colorScheme) private var colorScheme
    private let systemImage: String

    public init(systemImage: String) {
        self.systemImage = systemImage
    }

    public var body: some View {
        let dark = colorScheme == .dark
        Image(systemName: systemImage)
            .font(.system(size: 30, weight: .regular))
            .symbolRenderingMode(.monochrome)
            .foregroundStyle(dark ? Color.white : Color(red: 0.059, green: 0.369, blue: 0.937))
            .frame(width: 66, height: 66)
            .background {
                RoundedRectangle(cornerRadius: 19, style: .continuous)
                    .fill(.ultraThinMaterial)
                    .overlay {
                        RoundedRectangle(cornerRadius: 19, style: .continuous)
                            .fill(dark ? Color.white.opacity(0.18) : Color.white.opacity(0.7))
                    }
                    .overlay {
                        RoundedRectangle(cornerRadius: 19, style: .continuous)
                            .strokeBorder(
                                dark
                                    ? Color.white.opacity(0.4)
                                    : Color(red: 0.690, green: 0.914, blue: 0.992).opacity(0.9),
                                lineWidth: 1
                            )
                    }
            }
            .shadow(color: .black.opacity(0.2), radius: 12, x: 0, y: 12)
    }
}
