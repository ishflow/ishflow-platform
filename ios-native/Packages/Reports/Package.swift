// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "Reports",
    platforms: [.iOS(.v26), .macOS(.v14)],
    products: [
        .library(name: "Reports", targets: ["Reports"])
    ],
    dependencies: [
        .package(path: "../AppShared"),
        .package(path: "../APIClient"),
        .package(path: "../Core")
    ],
    targets: [
        .target(
            name: "Reports",
            dependencies: [
                .product(name: "AppShared", package: "AppShared"),
                .product(name: "APIClient", package: "APIClient"),
                .product(name: "Core", package: "Core")
            ]
        ),
        .testTarget(
            name: "ReportsTests",
            dependencies: ["Reports"]
        )
    ]
)
