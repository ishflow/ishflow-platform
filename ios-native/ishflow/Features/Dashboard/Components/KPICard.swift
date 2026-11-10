import SwiftUI

struct KPICard: View {
    let title: LocalizedStringKey
    let value: String
    let delta: Double
    let deltaLabel: LocalizedStringKey
    let systemImage: String
    /// Optional tap handler. When non-nil, the card renders as a button with a
    /// trailing chevron and triggers a light haptic on tap.
    let action: (() -> Void)?

    init(
        title: LocalizedStringKey,
        value: String,
        delta: Double,
        deltaLabel: LocalizedStringKey,
        systemImage: String,
        action: (() -> Void)? = nil
    ) {
        self.title = title
        self.value = value
        self.delta = delta
        self.deltaLabel = deltaLabel
        self.systemImage = systemImage
        self.action = action
    }

    private var deltaColor: Color {
        if delta > 0 { return .green }
        if delta < 0 { return .red }
        return .secondary
    }

    private var deltaArrow: String {
        if delta > 0 { return "arrow.up.right" }
        if delta < 0 { return "arrow.down.right" }
        return "minus"
    }

    private var deltaText: String {
        let abs = Swift.abs(delta)
        return String(format: "%.0f%%", abs)
    }

    private var cardContent: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Image(systemName: systemImage)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text(title)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                if action != nil {
                    Spacer(minLength: 4)
                    Image(systemName: "chevron.right")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }
            Text(value)
                .font(.title3.weight(.semibold))
                .foregroundStyle(.primary)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            HStack(spacing: 4) {
                Image(systemName: deltaArrow)
                Text(deltaText)
                Text(deltaLabel)
            }
            .font(.caption2)
            .foregroundStyle(deltaColor)
        }
        .padding(12)
        .frame(maxWidth: .infinity, minHeight: 92, alignment: .leading)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14))
        .contentShape(RoundedRectangle(cornerRadius: 14))
    }

    var body: some View {
        if let action {
            Button {
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                action()
            } label: {
                cardContent
            }
            .buttonStyle(.plain)
        } else {
            cardContent
        }
    }
}

#Preview {
    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
        KPICard(
            title: "dashboard.kpi.receivable",
            value: "$1,250",
            delta: 12.4,
            deltaLabel: "dashboard.delta.vs30Days",
            systemImage: "arrow.down.left.circle",
            action: {}
        )
        KPICard(
            title: "dashboard.kpi.payable",
            value: "$840",
            delta: -8.1,
            deltaLabel: "dashboard.delta.vs30Days",
            systemImage: "arrow.up.right.circle"
        )
    }
    .padding()
}
