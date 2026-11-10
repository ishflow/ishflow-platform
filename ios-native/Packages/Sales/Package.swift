// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "Sales",
    platforms: [.iOS(.v26), .macOS(.v14)],
    products: [
        .library(name: "Sales", targets: ["Sales"])
    ],
    dependencies: [
        .package(path: "../AppShared"),
        .package(path: "../APIClient"),
        .package(path: "../Core"),
        .package(path: "../Inventory")
    ],
    targets: [
        .target(
            name: "Sales",
            dependencies: [
                .product(name: "AppShared", package: "AppShared"),
                .product(name: "APIClient", package: "APIClient"),
                .product(name: "Core", package: "Core"),
                .product(name: "Inventory", package: "Inventory")
            ]
        ),
        .testTarget(
            name: "SalesTests",
            dependencies: ["Sales"]
        )
    ]
)
