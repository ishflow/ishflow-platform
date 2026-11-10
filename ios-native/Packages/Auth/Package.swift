// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "Auth",
    platforms: [.iOS(.v26), .macOS(.v14)],
    products: [
        .library(name: "Auth", targets: ["Auth"])
    ],
    dependencies: [
        .package(path: "../AppShared"),
        .package(path: "../APIClient")
    ],
    targets: [
        .target(
            name: "Auth",
            dependencies: [
                .product(name: "AppShared", package: "AppShared"),
                .product(name: "APIClient", package: "APIClient")
            ]
        ),
        .testTarget(
            name: "AuthTests",
            dependencies: ["Auth"]
        )
    ]
)
