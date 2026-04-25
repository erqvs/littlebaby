import Foundation

public enum LittleBabyDeviceCommand: String, Codable, Sendable {
    case status = "device.status"
    case info = "device.info"
}

public enum LittleBabyBatteryState: String, Codable, Sendable {
    case unknown
    case unplugged
    case charging
    case full
}

public enum LittleBabyThermalState: String, Codable, Sendable {
    case nominal
    case fair
    case serious
    case critical
}

public enum LittleBabyNetworkPathStatus: String, Codable, Sendable {
    case satisfied
    case unsatisfied
    case requiresConnection
}

public enum LittleBabyNetworkInterfaceType: String, Codable, Sendable {
    case wifi
    case cellular
    case wired
    case other
}

public struct LittleBabyBatteryStatusPayload: Codable, Sendable, Equatable {
    public var level: Double?
    public var state: LittleBabyBatteryState
    public var lowPowerModeEnabled: Bool

    public init(level: Double?, state: LittleBabyBatteryState, lowPowerModeEnabled: Bool) {
        self.level = level
        self.state = state
        self.lowPowerModeEnabled = lowPowerModeEnabled
    }
}

public struct LittleBabyThermalStatusPayload: Codable, Sendable, Equatable {
    public var state: LittleBabyThermalState

    public init(state: LittleBabyThermalState) {
        self.state = state
    }
}

public struct LittleBabyStorageStatusPayload: Codable, Sendable, Equatable {
    public var totalBytes: Int64
    public var freeBytes: Int64
    public var usedBytes: Int64

    public init(totalBytes: Int64, freeBytes: Int64, usedBytes: Int64) {
        self.totalBytes = totalBytes
        self.freeBytes = freeBytes
        self.usedBytes = usedBytes
    }
}

public struct LittleBabyNetworkStatusPayload: Codable, Sendable, Equatable {
    public var status: LittleBabyNetworkPathStatus
    public var isExpensive: Bool
    public var isConstrained: Bool
    public var interfaces: [LittleBabyNetworkInterfaceType]

    public init(
        status: LittleBabyNetworkPathStatus,
        isExpensive: Bool,
        isConstrained: Bool,
        interfaces: [LittleBabyNetworkInterfaceType])
    {
        self.status = status
        self.isExpensive = isExpensive
        self.isConstrained = isConstrained
        self.interfaces = interfaces
    }
}

public struct LittleBabyDeviceStatusPayload: Codable, Sendable, Equatable {
    public var battery: LittleBabyBatteryStatusPayload
    public var thermal: LittleBabyThermalStatusPayload
    public var storage: LittleBabyStorageStatusPayload
    public var network: LittleBabyNetworkStatusPayload
    public var uptimeSeconds: Double

    public init(
        battery: LittleBabyBatteryStatusPayload,
        thermal: LittleBabyThermalStatusPayload,
        storage: LittleBabyStorageStatusPayload,
        network: LittleBabyNetworkStatusPayload,
        uptimeSeconds: Double)
    {
        self.battery = battery
        self.thermal = thermal
        self.storage = storage
        self.network = network
        self.uptimeSeconds = uptimeSeconds
    }
}

public struct LittleBabyDeviceInfoPayload: Codable, Sendable, Equatable {
    public var deviceName: String
    public var modelIdentifier: String
    public var systemName: String
    public var systemVersion: String
    public var appVersion: String
    public var appBuild: String
    public var locale: String

    public init(
        deviceName: String,
        modelIdentifier: String,
        systemName: String,
        systemVersion: String,
        appVersion: String,
        appBuild: String,
        locale: String)
    {
        self.deviceName = deviceName
        self.modelIdentifier = modelIdentifier
        self.systemName = systemName
        self.systemVersion = systemVersion
        self.appVersion = appVersion
        self.appBuild = appBuild
        self.locale = locale
    }
}
