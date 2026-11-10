import SwiftUI

/// Small "Черн." (Draft) badge shown next to wizard titles.
/// Mirrors Android `WizardDraftChip`. Foreground / background scale to the
/// active `ColorScheme` so the chip stays legible on both white and black
/// nav-bar backdrops.
public struct WizardDraftChip: View {
    @Environment(\.colorScheme) private var colorScheme

    public init() {}

    public var body: some View {
        Text("wizard.short.draft")
            .font(.system(size: 10, weight: .bold))
            .tracking(0.6)
            .textCase(.uppercase)
            .foregroundStyle(foreground)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .fill(background)
            )
            .accessibilityLabel(Text("wizard.short.draft"))
    }

    private var foreground: Color {
        // Dark mode: cream/yellow over translucent amber reads well.
        // Light mode: that cream disappears on a near-white nav bar, so
        // drop to a saturated dark amber that contrasts against the
        // 18 %-opacity orange wash.
        colorScheme == .dark
            ? Color(red: 1.00, green: 0.82, blue: 0.54)
            : Color(red: 0.45, green: 0.24, blue: 0.00)
    }

    private var background: Color {
        Color(red: 0.95, green: 0.62, blue: 0.04)
            .opacity(colorScheme == .dark ? 0.22 : 0.20)
    }
}

#Preview {
    HStack {
        Text("Новая накладная").font(.headline)
        WizardDraftChip()
    }
    .padding()
    .background(.black)
}
