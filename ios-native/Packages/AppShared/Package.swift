// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "AppShared",
    platforms: [.iOS(.v26), .macOS(.v14)],
    products: [
        .library(name: "AppShared", targets: ["AppShared"])
    ],
    targets: [
        .target(name: "AppShared"),
        .testTarget(name: "AppSharedTests", dependencies: ["AppShared"])
    ]
)
