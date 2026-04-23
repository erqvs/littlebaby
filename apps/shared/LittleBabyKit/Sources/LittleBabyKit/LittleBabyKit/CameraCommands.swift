import Foundation

public enum LittleBabyCameraCommand: String, Codable, Sendable {
    case list = "camera.list"
    case snap = "camera.snap"
    case clip = "camera.clip"
}

public enum LittleBabyCameraFacing: String, Codable, Sendable {
    case back
    case front
}

public enum LittleBabyCameraImageFormat: String, Codable, Sendable {
    case jpg
    case jpeg
}

public enum LittleBabyCameraVideoFormat: String, Codable, Sendable {
    case mp4
}

public struct LittleBabyCameraSnapParams: Codable, Sendable, Equatable {
    public var facing: LittleBabyCameraFacing?
    public var maxWidth: Int?
    public var quality: Double?
    public var format: LittleBabyCameraImageFormat?
    public var deviceId: String?
    public var delayMs: Int?

    public init(
        facing: LittleBabyCameraFacing? = nil,
        maxWidth: Int? = nil,
        quality: Double? = nil,
        format: LittleBabyCameraImageFormat? = nil,
        deviceId: String? = nil,
        delayMs: Int? = nil)
    {
        self.facing = facing
        self.maxWidth = maxWidth
        self.quality = quality
        self.format = format
        self.deviceId = deviceId
        self.delayMs = delayMs
    }
}

public struct LittleBabyCameraClipParams: Codable, Sendable, Equatable {
    public var facing: LittleBabyCameraFacing?
    public var durationMs: Int?
    public var includeAudio: Bool?
    public var format: LittleBabyCameraVideoFormat?
    public var deviceId: String?

    public init(
        facing: LittleBabyCameraFacing? = nil,
        durationMs: Int? = nil,
        includeAudio: Bool? = nil,
        format: LittleBabyCameraVideoFormat? = nil,
        deviceId: String? = nil)
    {
        self.facing = facing
        self.durationMs = durationMs
        self.includeAudio = includeAudio
        self.format = format
        self.deviceId = deviceId
    }
}
