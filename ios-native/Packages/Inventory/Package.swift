// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "Inventory",
    platforms: [.iOS(.v26)],
    products: [
        .library(name: "Inventory", targets: ["Inventory"])
    ],
    dependencies: [
        .package(path: "../AppShared"),
        .package(path: "../APIClient"),
        .package(path: "../Core")
    ],
    targets: [
        .target(
            name: "Inventory",
            dependencies: [
                .product(name: "AppShared", package: "AppShared"),
                .product(name: "APIClient", package: "APIClient"),
                .product(name: "Core", package: "Core")
            ]
        ),
        .testTarget(
            name: "InventoryTests",
            dependencies: ["Inventory"]
        )
    ]
)
