import Foundation
import SwiftUI

@MainActor
public protocol ShareConfiguration {
    var apiBaseURL: URL { get }
    func currentBearerToken() async -> String?
}

private struct ShareConfigurationKey: EnvironmentKey {
    nonisolated(unsafe) static let defaultValue: (any ShareConfiguration)? = nil
}

extension EnvironmentValues {
    public var shareConfiguration: (any ShareConfiguration)? {
        get { self[ShareConfigurationKey.self] }
        set { self[ShareConfigurationKey.self] = newValue }
    }
}
