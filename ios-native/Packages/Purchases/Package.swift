// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "Purchases",
    platforms: [.iOS(.v26), .macOS(.v14)],
    products: [
        .library(name: "Purchases", targets: ["Purchases"])
    ],
    dependencies: [
        .package(path: "../AppShared"),
        .package(path: "../APIClient"),
        .package(path: "../Core"),
        .package(path: "../Sales"),
        .package(path: "../Inventory")
    ],
    targets: [
        .target(
            name: "Purchases",
            dependencies: [
                .product(name: "AppShared", package: "AppShared"),
                .product(name: "APIClient", package: "APIClient"),
                .product(name: "Core", package: "Core"),
                .product(name: "Sales", package: "Sales"),
                .product(name: "Inventory", package: "Inventory")
            ]
        ),
        .testTarget(
            name: "PurchasesTests",
            dependencies: ["Purchases"]
        )
    ]
)
