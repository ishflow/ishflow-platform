import AppShared
import SwiftUI

@MainActor
public struct WelcomeView: View {
    @AppStorage("hasSeenWelcome") private var hasSeenWelcome: Bool = false
    @State private var pageIndex: Int = 0
    private let onContinue: () -> Void

    private static let pageCount = 3

    public init(onContinue: @escaping () -> Void) {
        self.onContinue = onContinue
    }

    public var body: some View {
        ZStack {
            AuroraBackground()

            TabView(selection: $pageIndex) {
                welcomePage(
                    index: 0,
                    symbol: "chart.line.uptrend.xyaxis",
                    titleKey: "onboarding.welcome.page1.title",
                    bodyKey: "onboarding.welcome.page1.body",
                    showPills: true
                )
                .tag(0)

                welcomePage(
                    index: 1,
                    symbol: "shippingbox",
                    titleKey: "onboarding.welcome.page2.title",
                    bodyKey: "onboarding.welcome.page2.body",
                    showPills: false
                )
                .tag(1)

                welcomePage(
                    index: 2,
                    symbol: "chart.bar.xaxis",
                    titleKey: "onboarding.welcome.page3.title",
                    bodyKey: "onboarding.welcome.page3.body",
                    showPills: false
                )
                .tag(2)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
        }
    }

    private func welcomePage(
        index: Int,
        symbol: String,
        titleKey: LocalizedStringKey,
        bodyKey: LocalizedStringKey,
        showPills: Bool
    ) -> some View {
        VStack(spacing: 0) {
            HStack {
                Spacer()
                Button(LocalizedStringKey("onboarding.skipWelcome")) {
                    finish()
                }
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(Color.primary.opacity(0.72))
                .buttonStyle(.plain)
                .accessibilityIdentifier("onboarding.skip")
            }
            .padding(.horizontal, 6)
            .padding(.top, 4)

            Spacer()

            VStack(alignment: .leading, spacing: 0) {
                GlassMark(systemImage: symbol)
                    .padding(.bottom, 18)

                GlassCard {
                    VStack(alignment: .leading, spacing: 0) {
                        Text(titleKey)
                            .font(.system(size: 31, weight: .heavy))
                            .tracking(-0.6)
                            .foregroundStyle(Color.primary)
                            .fixedSize(horizontal: false, vertical: true)

                        Text(bodyKey)
                            .font(.system(size: 15.5))
                            .foregroundStyle(Color.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                            .padding(.top, 10)

                        if showPills {
                            HStack(spacing: 8) {
                                AuroraFeaturePill("onboarding.welcome.pill.sales")
                                AuroraFeaturePill("onboarding.welcome.pill.stock")
                                AuroraFeaturePill("onboarding.welcome.pill.accounts")
                            }
                            .padding(.top, 16)
                        }

                        Button(action: advance) {
                            HStack(spacing: 8) {
                                Text(index == 0 ? "onboarding.welcome.start" : "onboarding.continue")
                                Image(systemName: "arrow.right")
                                    .font(.system(size: 16, weight: .semibold))
                            }
                        }
                        .buttonStyle(AuroraPrimaryButtonStyle())
                        .padding(.top, 20)
                        .accessibilityIdentifier("onboarding.welcome.advance")

                        AuroraPageDots(count: Self.pageCount, activeIndex: index)
                            .frame(maxWidth: .infinity)
                            .padding(.top, 18)
                    }
                }
            }
        }
        .padding(.horizontal, 22)
        .padding(.bottom, 28)
    }

    private func advance() {
        if pageIndex >= Self.pageCount - 1 {
            finish()
        } else {
            withAnimation { pageIndex += 1 }
        }
    }

    private func finish() {
        hasSeenWelcome = true
        onContinue()
    }
}
