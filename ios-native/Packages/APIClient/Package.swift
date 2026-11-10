// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "APIClient",
    platforms: [.iOS(.v26), .macOS(.v14)],
    products: [
        .library(name: "APIClient", targets: ["APIClient"])
    ],
    dependencies: [
        .package(path: "../AppShared")
    ],
    targets: [
        .target(
            name: "APIClient",
            dependencies: [
                .product(name: "AppShared", package: "AppShared")
            ]
        ),
        .testTarget(
            name: "APIClientTests",
            dependencies: ["APIClient"]
        )
    ]
)
