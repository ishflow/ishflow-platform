import AppShared
import SwiftUI

/// Optional "seed demo data" step shown after the user creates a workspace.
/// Aurora reskin: aurora background + bottom-anchored glass card with a primary
/// "Yes" and a ghost "No". When import fails the "No" button swaps for a
/// "Continue anyway" affordance — failure must never block the user from
/// entering the app. All ViewModel actions are unchanged.
@MainActor
public struct DemoOfferView: View {
    @Bindable var viewModel: DemoOfferViewModel

    public init(viewModel: DemoOfferViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        ZStack {
            AuroraBackground()

            VStack(spacing: 0) {
                Spacer()

                GlassMark(systemImage: "sparkles")
                    .padding(.bottom, 18)

                GlassCard {
                    VStack(alignment: .leading, spacing: 0) {
                        Text("onboarding.demo.title")
                            .font(.system(size: 31, weight: .heavy))
                            .tracking(-0.6)
                            .foregroundStyle(Color.primary)
                            .fixedSize(horizontal: false, vertical: true)

                        Text("onboarding.demo.body")
                            .font(.system(size: 15.5))
                            .foregroundStyle(Color.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                            .padding(.top, 10)

                        if viewModel.inFlight {
                            ProgressView()
                                .controlSize(.large)
                                .frame(maxWidth: .infinity)
                                .padding(.top, 16)
                        }

                        Button {
                            Task { await viewModel.importDemo() }
                        } label: {
                            HStack(spacing: 8) {
                                Text("onboarding.demo.yes")
                                Image(systemName: "arrow.right")
                                    .font(.system(size: 16, weight: .semibold))
                            }
                        }
                        .buttonStyle(AuroraPrimaryButtonStyle())
                        .disabled(viewModel.inFlight)
                        .padding(.top, 20)
                        .accessibilityIdentifier("onboarding.demo.yes")

                        secondaryAction
                    }
                }
            }
            .padding(.horizontal, 22)
            .padding(.bottom, 28)
        }
    }

    @ViewBuilder
    private var secondaryAction: some View {
        if viewModel.error == .importFailed {
            Text("onboarding.demo.error")
                .font(.caption)
                .foregroundStyle(.red)
                .frame(maxWidth: .infinity)
                .padding(.top, 10)
            Button {
                viewModel.continueAnyway()
            } label: {
                Text("onboarding.demo.continueAnyway")
            }
            .buttonStyle(AuroraGhostButtonStyle())
            .padding(.top, 10)
            .accessibilityIdentifier("onboarding.demo.continueAnyway")
        } else {
            Button {
                viewModel.skip()
            } label: {
                Text("onboarding.demo.no")
            }
            .buttonStyle(AuroraGhostButtonStyle())
            .disabled(viewModel.inFlight)
            .padding(.top, 10)
            .accessibilityIdentifier("onboarding.demo.no")
        }
    }
}
