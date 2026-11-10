import SwiftUI

/// Toolbar bell button with an unread-count badge, shared across dashboard
/// variants. The badge counts open sync errors + offline-waiting alerts and
/// hides itself at zero.
///
/// The badge lives *inside* a ZStack (no overflowing `.offset`) so iOS 26's
/// circular toolbar-button glass background doesn't clip it — a thin
/// background-colored ring separates the red pill from the bell glyph for the
/// standard native look.
struct NotificationBellButton: View {
    let count: Int
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack(alignment: .topTrailing) {
                Image(systemName: "bell")
                    .font(.body)

                if count > 0 {
                    Text(count > 99 ? "99+" : "\(count)")
                        .font(.system(size: 11, weight: .bold))
                        .monospacedDigit()
                        .foregroundStyle(.white)
                        .padding(.horizontal, 4)
                        .frame(minWidth: 16, minHeight: 16)
                        .background(Capsule(style: .continuous).fill(Color.red))
                        .offset(x: 5, y: -5)
                }
            }
            // Pad so the offset badge stays within the button's content bounds
            // (and thus inside the glass background's clip region).
            .padding(.top, 5)
            .padding(.trailing, 5)
        }
        .accessibilityIdentifier("notifCenter.bell")
        .accessibilityLabel(Text("notifCenter.bell.a11y"))
        .accessibilityValue(count > 0 ? "\(count)" : "")
    }
}
