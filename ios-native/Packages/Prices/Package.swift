// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "Prices",
    platforms: [.iOS(.v26)],
    products: [
        .library(name: "Prices", targets: ["Prices"])
    ],
    dependencies: [
        .package(path: "../AppShared"),
        .package(path: "../APIClient"),
        .package(path: "../Core")
    ],
    targets: [
        .target(
            name: "Prices",
            dependencies: [
                .product(name: "AppShared", package: "AppShared"),
                .product(name: "APIClient", package: "APIClient"),
                .product(name: "Core", package: "Core")
            ]
        ),
        .testTarget(
            name: "PricesTests",
            dependencies: ["Prices"]
        )
    ]
)
