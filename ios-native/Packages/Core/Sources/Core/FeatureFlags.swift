import AppShared
import Foundation

/// Actor-isolated holder for the active tenant's `MobileFeatures` payload.
/// The container fetches the latest flags from `/v1/me` and pushes them in
/// via `update(_:)`; views read individual flags via `isEnabled(_:)`.
public actor FeatureFlags {
    /// Currently active feature payload. Defaults to all-enabled until refreshed.
    public private(set) var current: MobileFeatures = .init()

    /// Create a new feature-flag store with the default `MobileFeatures` value.
    public init() {}

    /// Replace the active feature payload (e.g. after a successful `/v1/me` refresh).
    public func update(_ features: MobileFeatures) {
        current = features
    }

    /// Check whether a `Bool` feature flag is enabled, addressed by key path.
    public func isEnabled(_ keyPath: KeyPath<MobileFeatures, Bool>) -> Bool {
        current[keyPath: keyPath]
    }
}
