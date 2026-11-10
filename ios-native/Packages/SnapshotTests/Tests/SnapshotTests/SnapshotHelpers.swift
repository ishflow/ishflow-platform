import SnapshotTesting
import SwiftUI

extension Snapshotting where Value: SwiftUI.View, Format == UIImage {
    static var iPhone17Light: Snapshotting<Value, UIImage> {
        .image(layout: .device(config: .iPhone17), traits: .init(userInterfaceStyle: .light))
    }

    static var iPhone17Dark: Snapshotting<Value, UIImage> {
        .image(layout: .device(config: .iPhone17), traits: .init(userInterfaceStyle: .dark))
    }
}

extension ViewImageConfig {
    static let iPhone17 = ViewImageConfig.iPhone13Pro
}
