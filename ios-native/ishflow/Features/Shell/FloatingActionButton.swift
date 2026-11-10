import SwiftUI

/// Round 56pt orange "+" button used as the centered shell FAB.
/// Hosts no navigation logic — the action is supplied by the caller.
struct FloatingActionButton: View {
    let action: () -> Void
    @State private var trigger = 0

    var body: some View {
        Button {
            trigger &+= 1
            action()
        } label: {
            Image(systemName: "plus")
                .font(.system(size: 22, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 56, height: 56)
                .background(Color.accentColor, in: .circle)
                .shadow(color: Color.black.opacity(0.18), radius: 8, x: 0, y: 4)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text("shell.fab.label"))
        .sensoryFeedback(.impact(weight: .medium), trigger: trigger)
    }
}
