// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "Core",
    platforms: [.iOS(.v26), .macOS(.v14)],
    products: [
        .library(name: "Core", targets: ["Core"])
    ],
    dependencies: [
        .package(path: "../AppShared"),
        .package(path: "../APIClient")
    ],
    targets: [
        .target(
            name: "Core",
            dependencies: [
                .product(name: "AppShared", package: "AppShared"),
                .product(name: "APIClient", package: "APIClient")
            ]
        ),
        .testTarget(
            name: "CoreTests",
            dependencies: ["Core"]
        )
    ]
)
