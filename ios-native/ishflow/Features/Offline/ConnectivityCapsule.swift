import SwiftUI
import OfflineSync

struct ConnectivityCapsule: View {
    let state: NetworkMonitor.ConnectivityState
    let pendingCount: Int
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 4) {
                Image(systemName: iconName)
                    .font(.caption)
                if pendingCount > 0 {
                    Text("\(pendingCount)")
                        .font(.caption.bold())
                }
            }
            .foregroundStyle(color)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(color.opacity(0.12), in: Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(accessibilityLabel)
    }

    private var iconName: String {
        switch state {
        case .online: "wifi"
        case .degraded: "wifi.exclamationmark"
        case .offline: "wifi.slash"
        }
    }

    private var color: Color {
        switch state {
        case .online: .green
        case .degraded: .yellow
        case .offline: .red
        }
    }

    private var accessibilityLabel: String {
        switch state {
        case .online: "online"
        case .degraded: "degraded"
        case .offline: "offline"
        }
    }
}
