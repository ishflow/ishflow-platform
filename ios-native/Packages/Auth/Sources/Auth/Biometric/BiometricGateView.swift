import SwiftUI

/// Full-screen overlay that prompts for biometric authentication when the app
/// becomes active after being backgrounded longer than the configured timeout.
public struct BiometricGateView<Content: View>: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var isLocked = false
    @State private var isAuthenticating = false
    private let gate = BiometricGate()
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        ZStack {
            content
                .opacity(isLocked ? 0 : 1)

            if isLocked {
                Color.black.ignoresSafeArea()
                VStack(spacing: 24) {
                    Image(systemName: "lock.fill")
                        .font(.system(size: 64))
                        .foregroundStyle(.secondary)
                    Text("auth.biometric.unlockPrompt")
                        .font(.title2)
                        .multilineTextAlignment(.center)
                    Button {
                        Task { await authenticate() }
                    } label: {
                        Label("auth.biometric.unlockButton", systemImage: "faceid")
                            .font(.headline)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(isAuthenticating)
                }
                .padding()
            }
        }
        .task {
            await checkLock()
        }
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .active {
                Task { await checkLock() }
            } else if newPhase == .background {
                Task { await gate.lock() }
            }
        }
    }

    private func checkLock() async {
        guard await gate.isEnabled else {
            isLocked = false
            return
        }
        isLocked = await gate.isLocked()
        if isLocked {
            await authenticate()
        }
    }

    private func authenticate() async {
        isAuthenticating = true
        defer { isAuthenticating = false }
        do {
            let success = try await gate.authenticate(
                reason: String(localized: "auth.biometric.reason")
            )
            if success {
                isLocked = false
            }
        } catch {
            // Stay locked; user can retry
        }
    }
}
