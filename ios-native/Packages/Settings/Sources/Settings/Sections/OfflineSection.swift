import Core
import SwiftUI

public struct OfflineSection: View {
    public init() {}

    public var body: some View {
        Section("Offline") {
            Label("Sync queue accessible via the connectivity indicator", systemImage: "arrow.triangle.2.circlepath")
                .foregroundStyle(.secondary)
                .font(.caption)
        }
    }
}
