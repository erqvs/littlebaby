// swift-tools-version: 6.2

import PackageDescription

let package = Package(
    name: "LittleBabyKit",
    platforms: [
        .iOS(.v18),
        .macOS(.v15),
    ],
    products: [
        .library(name: "LittleBabyProtocol", targets: ["LittleBabyProtocol"]),
        .library(name: "LittleBabyKit", targets: ["LittleBabyKit"]),
        .library(name: "LittleBabyChatUI", targets: ["LittleBabyChatUI"]),
    ],
    dependencies: [
        .package(url: "https://github.com/steipete/ElevenLabsKit", exact: "0.1.0"),
        .package(url: "https://github.com/gonzalezreal/textual", exact: "0.3.1"),
    ],
    targets: [
        .target(
            name: "LittleBabyProtocol",
            path: "Sources/LittleBabyProtocol",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "LittleBabyKit",
            dependencies: [
                "LittleBabyProtocol",
                .product(name: "ElevenLabsKit", package: "ElevenLabsKit"),
            ],
            path: "Sources/LittleBabyKit",
            resources: [
                .process("Resources"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "LittleBabyChatUI",
            dependencies: [
                "LittleBabyKit",
                .product(
                    name: "Textual",
                    package: "textual",
                    condition: .when(platforms: [.macOS, .iOS])),
            ],
            path: "Sources/LittleBabyChatUI",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .testTarget(
            name: "LittleBabyKitTests",
            dependencies: ["LittleBabyKit", "LittleBabyChatUI"],
            path: "Tests/LittleBabyKitTests",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
                .enableExperimentalFeature("SwiftTesting"),
            ]),
    ])
