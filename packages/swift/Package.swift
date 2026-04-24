// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "Yolk",
    platforms: [
        .macOS(.v14),
        .iOS(.v17)
    ],
    products: [
        .library(name: "Yolk", targets: ["Yolk"]),
    ],
    targets: [
        .target(
            name: "Yolk",
            dependencies: [],
            swiftSettings: [.enableExperimentalFeature("StrictConcurrency")]
        ),
        .testTarget(
            name: "YolkTests",
            dependencies: ["Yolk"]
        ),
    ]
)
