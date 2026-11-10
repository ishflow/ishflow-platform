// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "SnapshotTests",
    platforms: [.iOS(.v26)],
    dependencies: [
        .package(url: "https://github.com/pointfreeco/swift-snapshot-testing", from: "1.18.0"),
        .package(path: "../Auth"),
        .package(path: "../Sales"),
        .package(path: "../Prices"),
        .package(path: "../Settings"),
        .package(path: "../AppShared"),
        .package(path: "../APIClient"),
        .package(path: "../Core")
    ],
    targets: [
        .testTarget(
            name: "SnapshotTests",
            dependencies: [
                .product(name: "SnapshotTesting", package: "swift-snapshot-testing"),
                .product(name: "Auth", package: "Auth"),
                .product(name: "Sales", package: "Sales"),
                .product(name: "Prices", package: "Prices"),
                .product(name: "Settings", package: "Settings"),
                .product(name: "AppShared", package: "AppShared"),
                .product(name: "APIClient", package: "APIClient"),
                .product(name: "Core", package: "Core")
            ]
        )
    ]
)
