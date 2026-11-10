// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "Cari",
    platforms: [.iOS(.v26), .macOS(.v14)],
    products: [
        .library(name: "Cari", targets: ["Cari"])
    ],
    dependencies: [
        .package(path: "../AppShared"),
        .package(path: "../APIClient"),
        .package(path: "../Core"),
        .package(path: "../Sales")
    ],
    targets: [
        .target(
            name: "Cari",
            dependencies: [
                .product(name: "AppShared", package: "AppShared"),
                .product(name: "APIClient", package: "APIClient"),
                .product(name: "Core", package: "Core"),
                .product(name: "Sales", package: "Sales")
            ]
        ),
        .testTarget(
            name: "CariTests",
            dependencies: ["Cari"]
        )
    ]
)
