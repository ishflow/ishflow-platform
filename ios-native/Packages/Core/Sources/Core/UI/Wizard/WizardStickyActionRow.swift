import SwiftUI

/// The Save-Draft + Post button pair pinned above the scrolling wizard body.
/// Save is tonal glass; Post is filled with the app accent (the user's "money in" CTA).
/// Mirrors Android `WizardStickyActionRow`.
public struct WizardStickyActionRow: View {
    public let canSaveDraft: Bool
    public let canPost: Bool
    public let isPosting: Bool
    public let onSaveDraft: () -> Void
    public let onPost: () -> Void

    public init(
        canSaveDraft: Bool,
        canPost: Bool,
        isPosting: Bool,
        onSaveDraft: @escaping () -> Void,
        onPost: @escaping () -> Void
    ) {
        self.canSaveDraft = canSaveDraft
        self.canPost = canPost
        self.isPosting = isPosting
        self.onSaveDraft = onSaveDraft
        self.onPost = onPost
    }

    public var body: some View {
        HStack(spacing: 8) {
            Button(action: onSaveDraft) {
                Text("wizard.short.save")
                    .font(.system(size: 15, weight: .semibold))
                    .frame(maxWidth: .infinity)
                    .frame(height: WizardTokens.actionPillHeight)
                    .foregroundStyle(.primary)
                    .background(
                        Capsule(style: .continuous)
                            .fill(.ultraThinMaterial)
                    )
                    .overlay(
                        Capsule(style: .continuous)
                            .strokeBorder(WizardTokens.solidStroke, lineWidth: 0.5)
                    )
            }
            .buttonStyle(.plain)
            .disabled(!canSaveDraft || isPosting)
            .opacity(canSaveDraft && !isPosting ? 1.0 : 0.45)
            .accessibilityIdentifier("wizard.saveDraft")

            Button(action: onPost) {
                Group {
                    if isPosting {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("wizard.short.post")
                            .font(.system(size: 15, weight: .semibold))
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: WizardTokens.actionPillHeight)
                .foregroundStyle(.white)
                .background(
                    Capsule(style: .continuous)
                        .fill(Color.accentColor)
                        .shadow(color: Color.accentColor.opacity(0.45), radius: 8, x: 0, y: 4)
                )
            }
            .buttonStyle(.plain)
            .disabled(!canPost || isPosting)
            .opacity(canPost && !isPosting ? 1.0 : 0.45)
            .accessibilityIdentifier("wizard.post")
        }
        .padding(.horizontal, 14)
        .padding(.top, 12)
        .padding(.bottom, 10)
    }
}

#Preview {
    VStack(spacing: 8) {
        WizardStickyActionRow(
            canSaveDraft: false,
            canPost: false,
            isPosting: false,
            onSaveDraft: {},
            onPost: {}
        )
        WizardStickyActionRow(
            canSaveDraft: true,
            canPost: true,
            isPosting: false,
            onSaveDraft: {},
            onPost: {}
        )
    }
    .padding()
    .background(.black)
}
