// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "Docs",
    platforms: [.iOS(.v26), .macOS(.v14)],
    products: [
        .library(name: "Docs", targets: ["Docs"])
    ],
    dependencies: [
        .package(path: "../AppShared"),
        .package(path: "../APIClient"),
        .package(path: "../Core"),
        .package(path: "../Sales")
    ],
    targets: [
        .target(
            name: "Docs",
            dependencies: [
                .product(name: "AppShared", package: "AppShared"),
                .product(name: "APIClient", package: "APIClient"),
                .product(name: "Core", package: "Core"),
                .product(name: "Sales", package: "Sales")
            ]
        ),
        .testTarget(
            name: "DocsTests",
            dependencies: ["Docs"]
        )
    ]
)
