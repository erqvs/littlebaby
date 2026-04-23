import CoreLocation
import Foundation
import LittleBabyKit
import UIKit

typealias LittleBabyCameraSnapResult = (format: String, base64: String, width: Int, height: Int)
typealias LittleBabyCameraClipResult = (format: String, base64: String, durationMs: Int, hasAudio: Bool)

protocol CameraServicing: Sendable {
    func listDevices() async -> [CameraController.CameraDeviceInfo]
    func snap(params: LittleBabyCameraSnapParams) async throws -> LittleBabyCameraSnapResult
    func clip(params: LittleBabyCameraClipParams) async throws -> LittleBabyCameraClipResult
}

protocol ScreenRecordingServicing: Sendable {
    func record(
        screenIndex: Int?,
        durationMs: Int?,
        fps: Double?,
        includeAudio: Bool?,
        outPath: String?) async throws -> String
}

@MainActor
protocol LocationServicing: Sendable {
    func authorizationStatus() -> CLAuthorizationStatus
    func accuracyAuthorization() -> CLAccuracyAuthorization
    func ensureAuthorization(mode: LittleBabyLocationMode) async -> CLAuthorizationStatus
    func currentLocation(
        params: LittleBabyLocationGetParams,
        desiredAccuracy: LittleBabyLocationAccuracy,
        maxAgeMs: Int?,
        timeoutMs: Int?) async throws -> CLLocation
    func startLocationUpdates(
        desiredAccuracy: LittleBabyLocationAccuracy,
        significantChangesOnly: Bool) -> AsyncStream<CLLocation>
    func stopLocationUpdates()
    func startMonitoringSignificantLocationChanges(onUpdate: @escaping @Sendable (CLLocation) -> Void)
    func stopMonitoringSignificantLocationChanges()
}

@MainActor
protocol DeviceStatusServicing: Sendable {
    func status() async throws -> LittleBabyDeviceStatusPayload
    func info() -> LittleBabyDeviceInfoPayload
}

protocol PhotosServicing: Sendable {
    func latest(params: LittleBabyPhotosLatestParams) async throws -> LittleBabyPhotosLatestPayload
}

protocol ContactsServicing: Sendable {
    func search(params: LittleBabyContactsSearchParams) async throws -> LittleBabyContactsSearchPayload
    func add(params: LittleBabyContactsAddParams) async throws -> LittleBabyContactsAddPayload
}

protocol CalendarServicing: Sendable {
    func events(params: LittleBabyCalendarEventsParams) async throws -> LittleBabyCalendarEventsPayload
    func add(params: LittleBabyCalendarAddParams) async throws -> LittleBabyCalendarAddPayload
}

protocol RemindersServicing: Sendable {
    func list(params: LittleBabyRemindersListParams) async throws -> LittleBabyRemindersListPayload
    func add(params: LittleBabyRemindersAddParams) async throws -> LittleBabyRemindersAddPayload
}

protocol MotionServicing: Sendable {
    func activities(params: LittleBabyMotionActivityParams) async throws -> LittleBabyMotionActivityPayload
    func pedometer(params: LittleBabyPedometerParams) async throws -> LittleBabyPedometerPayload
}

struct WatchMessagingStatus: Sendable, Equatable {
    var supported: Bool
    var paired: Bool
    var appInstalled: Bool
    var reachable: Bool
    var activationState: String
}

struct WatchQuickReplyEvent: Sendable, Equatable {
    var replyId: String
    var promptId: String
    var actionId: String
    var actionLabel: String?
    var sessionKey: String?
    var note: String?
    var sentAtMs: Int?
    var transport: String
}

struct WatchExecApprovalResolveEvent: Sendable, Equatable {
    var replyId: String
    var approvalId: String
    var decision: LittleBabyWatchExecApprovalDecision
    var sentAtMs: Int?
    var transport: String
}

struct WatchExecApprovalSnapshotRequestEvent: Sendable, Equatable {
    var requestId: String
    var sentAtMs: Int?
    var transport: String
}

struct WatchNotificationSendResult: Sendable, Equatable {
    var deliveredImmediately: Bool
    var queuedForDelivery: Bool
    var transport: String
}

protocol WatchMessagingServicing: AnyObject, Sendable {
    func status() async -> WatchMessagingStatus
    func setStatusHandler(_ handler: (@Sendable (WatchMessagingStatus) -> Void)?)
    func setReplyHandler(_ handler: (@Sendable (WatchQuickReplyEvent) -> Void)?)
    func setExecApprovalResolveHandler(_ handler: (@Sendable (WatchExecApprovalResolveEvent) -> Void)?)
    func setExecApprovalSnapshotRequestHandler(
        _ handler: (@Sendable (WatchExecApprovalSnapshotRequestEvent) -> Void)?)
    func sendNotification(
        id: String,
        params: LittleBabyWatchNotifyParams) async throws -> WatchNotificationSendResult
    func sendExecApprovalPrompt(
        _ message: LittleBabyWatchExecApprovalPromptMessage) async throws -> WatchNotificationSendResult
    func sendExecApprovalResolved(
        _ message: LittleBabyWatchExecApprovalResolvedMessage) async throws -> WatchNotificationSendResult
    func sendExecApprovalExpired(
        _ message: LittleBabyWatchExecApprovalExpiredMessage) async throws -> WatchNotificationSendResult
    func syncExecApprovalSnapshot(
        _ message: LittleBabyWatchExecApprovalSnapshotMessage) async throws -> WatchNotificationSendResult
}

extension CameraController: CameraServicing {}
extension ScreenRecordService: ScreenRecordingServicing {}
extension LocationService: LocationServicing {}
