import SwiftUI

extension View {
    /// Adds a centered FAB to the bottom safe area of the receiving view.
    /// Uses `safeAreaInset(.bottom)` so scroll content insets and tab bar
    /// minimization track correctly.
    func fabOverlay(action: @escaping () -> Void) -> some View {
        safeAreaInset(edge: .bottom, alignment: .center, spacing: 0) {
            FloatingActionButton(action: action)
                .padding(.top, 8)
                .padding(.bottom, 4)
                .frame(maxWidth: .infinity, alignment: .center)
        }
    }
}
