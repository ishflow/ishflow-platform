import Auth
import SwiftUI

/// Settings section for biometric authentication controls.
public struct SecuritySection: View {
    @State private var isEnabled = false
    @State private var timeoutMinutes = BiometricGate.defaultTimeoutMinutes
    @State private var isAvailable = false
    private let gate = BiometricGate()

    public init() {}

    public var body: some View {
        Section {
            if isAvailable {
                Toggle("auth.biometric.enable", isOn: $isEnabled)
                    .onChange(of: isEnabled) { _, newValue in
                        Task {
                            if newValue {
                                do {
                                    let success = try await gate.authenticate(
                                        reason: String(localized: "auth.biometric.reason")
                                    )
                                    if !success {
                                        isEnabled = false
                                    }
                                } catch {
                                    isEnabled = false
                                }
                            }
                            await gate.setEnabled(newValue)
                        }
                    }

                if isEnabled {
                    Stepper(
                        value: $timeoutMinutes,
                        in: 1...60,
                        step: 1
                    ) {
                        Text("auth.biometric.timeout \(timeoutMinutes)")
                    }
                    .onChange(of: timeoutMinutes) { _, newValue in
                        Task { await gate.setTimeoutMinutes(newValue) }
                    }
                }
            } else {
                Label("auth.biometric.unavailable", systemImage: "faceid")
                    .foregroundStyle(.secondary)
            }
        } header: {
            Text("settings.security.header")
        } footer: {
            Text("settings.security.footer")
        }
        .task {
            isAvailable = await gate.canEvaluatePolicy()
            isEnabled = await gate.isEnabled
            timeoutMinutes = await gate.timeoutMinutes
        }
    }
}

extension BiometricGate {
    fileprivate func setEnabled(_ value: Bool) {
        isEnabled = value
    }

    fileprivate func setTimeoutMinutes(_ value: Int) {
        timeoutMinutes = value
    }
}
