// swift-tools-version: 6.2
// Package manifest for the LittleBaby macOS companion (menu bar app + IPC library).

import PackageDescription

let package = Package(
    name: "LittleBaby",
    platforms: [
        .macOS(.v15),
    ],
    products: [
        .library(name: "LittleBabyIPC", targets: ["LittleBabyIPC"]),
        .library(name: "LittleBabyDiscovery", targets: ["LittleBabyDiscovery"]),
        .executable(name: "LittleBaby", targets: ["LittleBaby"]),
        .executable(name: "littlebaby-mac", targets: ["LittleBabyMacCLI"]),
    ],
    dependencies: [
        .package(url: "https://github.com/orchetect/MenuBarExtraAccess", exact: "1.2.2"),
        .package(url: "https://github.com/swiftlang/swift-subprocess.git", from: "0.4.0"),
        .package(url: "https://github.com/apple/swift-log.git", from: "1.10.1"),
        .package(url: "https://github.com/sparkle-project/Sparkle", from: "2.9.0"),
        .package(url: "https://github.com/steipete/Peekaboo.git", branch: "main"),
        .package(url: "https://github.com/Blaizzy/mlx-audio-swift", exact: "0.1.2"),
        .package(path: "../shared/LittleBabyKit"),
        .package(path: "../../Swabble"),
    ],
    targets: [
        .target(
            name: "LittleBabyIPC",
            dependencies: [],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "LittleBabyDiscovery",
            dependencies: [
                .product(name: "LittleBabyKit", package: "LittleBabyKit"),
            ],
            path: "Sources/LittleBabyDiscovery",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "LittleBaby",
            dependencies: [
                "LittleBabyIPC",
                "LittleBabyDiscovery",
                .product(name: "LittleBabyKit", package: "LittleBabyKit"),
                .product(name: "LittleBabyChatUI", package: "LittleBabyKit"),
                .product(name: "LittleBabyProtocol", package: "LittleBabyKit"),
                .product(name: "SwabbleKit", package: "swabble"),
                .product(name: "MenuBarExtraAccess", package: "MenuBarExtraAccess"),
                .product(name: "Subprocess", package: "swift-subprocess"),
                .product(name: "Logging", package: "swift-log"),
                .product(name: "Sparkle", package: "Sparkle"),
                .product(name: "PeekabooBridge", package: "Peekaboo"),
                .product(name: "PeekabooAutomationKit", package: "Peekaboo"),
                .product(name: "MLXAudioTTS", package: "mlx-audio-swift"),
            ],
            exclude: [
                "Resources/Info.plist",
            ],
            resources: [
                .copy("Resources/LittleBaby.icns"),
                .copy("Resources/DeviceModels"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "LittleBabyMacCLI",
            dependencies: [
                "LittleBabyDiscovery",
                .product(name: "LittleBabyKit", package: "LittleBabyKit"),
                .product(name: "LittleBabyProtocol", package: "LittleBabyKit"),
            ],
            path: "Sources/LittleBabyMacCLI",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .testTarget(
            name: "LittleBabyIPCTests",
            dependencies: [
                "LittleBabyIPC",
                "LittleBaby",
                "LittleBabyDiscovery",
                .product(name: "LittleBabyProtocol", package: "LittleBabyKit"),
                .product(name: "SwabbleKit", package: "swabble"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
                .enableExperimentalFeature("SwiftTesting"),
            ]),
    ])
