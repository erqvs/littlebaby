import ActivityKit
import Foundation

/// Shared schema used by iOS app + Live Activity widget extension.
struct LittleBabyActivityAttributes: ActivityAttributes {
    var agentName: String
    var sessionKey: String

    struct ContentState: Codable, Hashable {
        var statusText: String
        var isIdle: Bool
        var isDisconnected: Bool
        var isConnecting: Bool
        var startedAt: Date
    }
}

#if DEBUG
extension LittleBabyActivityAttributes {
    static let preview = LittleBabyActivityAttributes(agentName: "main", sessionKey: "main")
}

extension LittleBabyActivityAttributes.ContentState {
    static let connecting = LittleBabyActivityAttributes.ContentState(
        statusText: "Connecting...",
        isIdle: false,
        isDisconnected: false,
        isConnecting: true,
        startedAt: .now)

    static let idle = LittleBabyActivityAttributes.ContentState(
        statusText: "Idle",
        isIdle: true,
        isDisconnected: false,
        isConnecting: false,
        startedAt: .now)

    static let disconnected = LittleBabyActivityAttributes.ContentState(
        statusText: "Disconnected",
        isIdle: false,
        isDisconnected: true,
        isConnecting: false,
        startedAt: .now)
}
#endif
