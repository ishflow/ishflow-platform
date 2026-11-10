// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "Onboarding",
    platforms: [.iOS(.v26)],
    products: [
        .library(name: "Onboarding", targets: ["Onboarding"])
    ],
    dependencies: [
        .package(path: "../AppShared"),
        .package(path: "../APIClient"),
        .package(path: "../Core"),
        .package(path: "../Auth")
    ],
    targets: [
        .target(
            name: "Onboarding",
            dependencies: [
                .product(name: "AppShared", package: "AppShared"),
                .product(name: "APIClient", package: "APIClient"),
                .product(name: "Core", package: "Core"),
                .product(name: "Auth", package: "Auth")
            ]
        ),
        .testTarget(
            name: "OnboardingTests",
            dependencies: ["Onboarding"]
        )
    ]
)
