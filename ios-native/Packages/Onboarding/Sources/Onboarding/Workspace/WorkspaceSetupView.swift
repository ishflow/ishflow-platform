import AppShared
import SwiftUI

/// Form the user fills on their first run to name their tenant, pick a base
/// currency, and pick a UI locale. Bound to `WorkspaceSetupViewModel`.
/// Aurora reskin: aurora background + bottom-anchored glass card with glass field
/// rows. All ViewModel bindings, validation and the submit action are unchanged.
@MainActor
public struct WorkspaceSetupView: View {
    @Bindable var viewModel: WorkspaceSetupViewModel

    public init(viewModel: WorkspaceSetupViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        ZStack {
            AuroraBackground()

            VStack(spacing: 0) {
                Spacer()

                GlassMark(systemImage: "building.2")
                    .padding(.bottom, 18)

                GlassCard {
                    VStack(alignment: .leading, spacing: 0) {
                        Text("onboarding.workspace.title")
                            .font(.system(size: 31, weight: .heavy))
                            .tracking(-0.6)
                            .foregroundStyle(Color.primary)
                            .fixedSize(horizontal: false, vertical: true)

                        nameField
                            .padding(.top, 16)

                        currencyField
                            .padding(.top, 11)

                        localeField
                            .padding(.top, 11)

                        submitButton
                            .padding(.top, 20)

                        errorMessage
                    }
                }
            }
            .padding(.horizontal, 22)
            .padding(.bottom, 28)
        }
    }

    private var nameField: some View {
        VStack(alignment: .leading, spacing: 0) {
            GlassFieldRow {
                VStack(alignment: .leading, spacing: 2) {
                    Text("onboarding.workspace.name")
                        .glassFieldLabel()
                    TextField("onboarding.workspace.namePlaceholder", text: $viewModel.name)
                        .font(.system(size: 16, weight: .semibold))
                        .textInputAutocapitalization(.words)
                        .accessibilityIdentifier("onboarding.workspace.name")
                }
            }
            if case .validation(field: "name") = viewModel.error {
                Text("onboarding.workspace.error.nameShort")
                    .font(.caption)
                    .foregroundStyle(.red)
                    .padding(.top, 4)
            }
        }
    }

    private var currencyField: some View {
        Menu {
            Picker("onboarding.workspace.currency", selection: $viewModel.currency) {
                ForEach(CurrencySuggestion.allCodes, id: \.self) { code in
                    Text(code).tag(code)
                }
            }
        } label: {
            GlassFieldRow(showsChevron: true) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("onboarding.workspace.currency")
                        .glassFieldLabel()
                    Text(viewModel.currency)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Color.primary)
                }
            }
        }
        .accessibilityIdentifier("onboarding.workspace.currency")
    }

    private var localeField: some View {
        Menu {
            Picker("onboarding.workspace.locale", selection: $viewModel.locale) {
                ForEach(CurrencySuggestion.supportedLocales, id: \.self) { code in
                    Text(code.uppercased()).tag(code)
                }
            }
        } label: {
            GlassFieldRow(showsChevron: true) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("onboarding.workspace.locale")
                        .glassFieldLabel()
                    Text(viewModel.locale.uppercased())
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Color.primary)
                }
            }
        }
        .accessibilityIdentifier("onboarding.workspace.locale")
    }

    private var submitButton: some View {
        Button {
            Task { await viewModel.submit() }
        } label: {
            if viewModel.inFlight {
                ProgressView()
                    .tint(.white)
                    .frame(maxWidth: .infinity)
            } else {
                HStack(spacing: 8) {
                    Text("onboarding.workspace.create")
                    Image(systemName: "arrow.right")
                        .font(.system(size: 16, weight: .semibold))
                }
            }
        }
        .buttonStyle(AuroraPrimaryButtonStyle())
        .disabled(!viewModel.canSubmit)
        .accessibilityIdentifier("onboarding.workspace.create")
    }

    @ViewBuilder
    private var errorMessage: some View {
        if case .alreadyOnboarded = viewModel.error {
            Text("onboarding.workspace.error.alreadyOnboarded")
                .font(.caption)
                .foregroundStyle(.red)
                .frame(maxWidth: .infinity)
                .padding(.top, 10)
        } else if case .network = viewModel.error {
            Text("onboarding.workspace.error.network")
                .font(.caption)
                .foregroundStyle(.red)
                .frame(maxWidth: .infinity)
                .padding(.top, 10)
        }
    }
}

/// A single frosted-glass field row used by the workspace setup form. Holds a
/// label/value stack and an optional trailing chevron (for picker rows).
private struct GlassFieldRow<Content: View>: View {
    @Environment(\.colorScheme) private var colorScheme
    private let showsChevron: Bool
    private let content: Content

    init(showsChevron: Bool = false, @ViewBuilder content: () -> Content) {
        self.showsChevron = showsChevron
        self.content = content()
    }

    var body: some View {
        let dark = colorScheme == .dark
        HStack {
            content
            Spacer()
            if showsChevron {
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Color.secondary.opacity(0.6))
            }
        }
        .padding(.horizontal, 15)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(dark ? Color.white.opacity(0.08) : Color.white.opacity(0.66))
                .overlay {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .strokeBorder(
                            dark ? Color.white.opacity(0.16) : AuroraPalette.blue.opacity(0.16),
                            lineWidth: 1
                        )
                }
        )
    }
}

private extension Text {
    /// Uppercased, tracked caption styling for a glass field's label line.
    func glassFieldLabel() -> some View {
        font(.system(size: 12, weight: .semibold))
            .textCase(.uppercase)
            .tracking(0.3)
            .foregroundStyle(Color.secondary.opacity(0.7))
    }
}
