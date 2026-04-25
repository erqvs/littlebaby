package ai.littlebaby.app.node

import ai.littlebaby.app.protocol.LittleBabyCalendarCommand
import ai.littlebaby.app.protocol.LittleBabyCanvasA2UICommand
import ai.littlebaby.app.protocol.LittleBabyCanvasCommand
import ai.littlebaby.app.protocol.LittleBabyCameraCommand
import ai.littlebaby.app.protocol.LittleBabyCapability
import ai.littlebaby.app.protocol.LittleBabyCallLogCommand
import ai.littlebaby.app.protocol.LittleBabyContactsCommand
import ai.littlebaby.app.protocol.LittleBabyDeviceCommand
import ai.littlebaby.app.protocol.LittleBabyLocationCommand
import ai.littlebaby.app.protocol.LittleBabyMotionCommand
import ai.littlebaby.app.protocol.LittleBabyNotificationsCommand
import ai.littlebaby.app.protocol.LittleBabyPhotosCommand
import ai.littlebaby.app.protocol.LittleBabySmsCommand
import ai.littlebaby.app.protocol.LittleBabySystemCommand

data class NodeRuntimeFlags(
  val cameraEnabled: Boolean,
  val locationEnabled: Boolean,
  val sendSmsAvailable: Boolean,
  val readSmsAvailable: Boolean,
  val smsSearchPossible: Boolean,
  val callLogAvailable: Boolean,
  val voiceWakeEnabled: Boolean,
  val motionActivityAvailable: Boolean,
  val motionPedometerAvailable: Boolean,
  val debugBuild: Boolean,
)

enum class InvokeCommandAvailability {
  Always,
  CameraEnabled,
  LocationEnabled,
  SendSmsAvailable,
  ReadSmsAvailable,
  RequestableSmsSearchAvailable,
  CallLogAvailable,
  MotionActivityAvailable,
  MotionPedometerAvailable,
  DebugBuild,
}

enum class NodeCapabilityAvailability {
  Always,
  CameraEnabled,
  LocationEnabled,
  SmsAvailable,
  CallLogAvailable,
  VoiceWakeEnabled,
  MotionAvailable,
}

data class NodeCapabilitySpec(
  val name: String,
  val availability: NodeCapabilityAvailability = NodeCapabilityAvailability.Always,
)

data class InvokeCommandSpec(
  val name: String,
  val requiresForeground: Boolean = false,
  val availability: InvokeCommandAvailability = InvokeCommandAvailability.Always,
)

object InvokeCommandRegistry {
  val capabilityManifest: List<NodeCapabilitySpec> =
    listOf(
      NodeCapabilitySpec(name = LittleBabyCapability.Canvas.rawValue),
      NodeCapabilitySpec(name = LittleBabyCapability.Device.rawValue),
      NodeCapabilitySpec(name = LittleBabyCapability.Notifications.rawValue),
      NodeCapabilitySpec(name = LittleBabyCapability.System.rawValue),
      NodeCapabilitySpec(
        name = LittleBabyCapability.Camera.rawValue,
        availability = NodeCapabilityAvailability.CameraEnabled,
      ),
      NodeCapabilitySpec(
        name = LittleBabyCapability.Sms.rawValue,
        availability = NodeCapabilityAvailability.SmsAvailable,
      ),
      NodeCapabilitySpec(
        name = LittleBabyCapability.VoiceWake.rawValue,
        availability = NodeCapabilityAvailability.VoiceWakeEnabled,
      ),
      NodeCapabilitySpec(
        name = LittleBabyCapability.Location.rawValue,
        availability = NodeCapabilityAvailability.LocationEnabled,
      ),
      NodeCapabilitySpec(name = LittleBabyCapability.Photos.rawValue),
      NodeCapabilitySpec(name = LittleBabyCapability.Contacts.rawValue),
      NodeCapabilitySpec(name = LittleBabyCapability.Calendar.rawValue),
      NodeCapabilitySpec(
        name = LittleBabyCapability.Motion.rawValue,
        availability = NodeCapabilityAvailability.MotionAvailable,
      ),
      NodeCapabilitySpec(
        name = LittleBabyCapability.CallLog.rawValue,
        availability = NodeCapabilityAvailability.CallLogAvailable,
      ),
    )

  val all: List<InvokeCommandSpec> =
    listOf(
      InvokeCommandSpec(
        name = LittleBabyCanvasCommand.Present.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = LittleBabyCanvasCommand.Hide.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = LittleBabyCanvasCommand.Navigate.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = LittleBabyCanvasCommand.Eval.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = LittleBabyCanvasCommand.Snapshot.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = LittleBabyCanvasA2UICommand.Push.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = LittleBabyCanvasA2UICommand.PushJSONL.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = LittleBabyCanvasA2UICommand.Reset.rawValue,
        requiresForeground = true,
      ),
      InvokeCommandSpec(
        name = LittleBabySystemCommand.Notify.rawValue,
      ),
      InvokeCommandSpec(
        name = LittleBabyCameraCommand.List.rawValue,
        requiresForeground = true,
        availability = InvokeCommandAvailability.CameraEnabled,
      ),
      InvokeCommandSpec(
        name = LittleBabyCameraCommand.Snap.rawValue,
        requiresForeground = true,
        availability = InvokeCommandAvailability.CameraEnabled,
      ),
      InvokeCommandSpec(
        name = LittleBabyCameraCommand.Clip.rawValue,
        requiresForeground = true,
        availability = InvokeCommandAvailability.CameraEnabled,
      ),
      InvokeCommandSpec(
        name = LittleBabyLocationCommand.Get.rawValue,
        availability = InvokeCommandAvailability.LocationEnabled,
      ),
      InvokeCommandSpec(
        name = LittleBabyDeviceCommand.Status.rawValue,
      ),
      InvokeCommandSpec(
        name = LittleBabyDeviceCommand.Info.rawValue,
      ),
      InvokeCommandSpec(
        name = LittleBabyDeviceCommand.Permissions.rawValue,
      ),
      InvokeCommandSpec(
        name = LittleBabyDeviceCommand.Health.rawValue,
      ),
      InvokeCommandSpec(
        name = LittleBabyNotificationsCommand.List.rawValue,
      ),
      InvokeCommandSpec(
        name = LittleBabyNotificationsCommand.Actions.rawValue,
      ),
      InvokeCommandSpec(
        name = LittleBabyPhotosCommand.Latest.rawValue,
      ),
      InvokeCommandSpec(
        name = LittleBabyContactsCommand.Search.rawValue,
      ),
      InvokeCommandSpec(
        name = LittleBabyContactsCommand.Add.rawValue,
      ),
      InvokeCommandSpec(
        name = LittleBabyCalendarCommand.Events.rawValue,
      ),
      InvokeCommandSpec(
        name = LittleBabyCalendarCommand.Add.rawValue,
      ),
      InvokeCommandSpec(
        name = LittleBabyMotionCommand.Activity.rawValue,
        availability = InvokeCommandAvailability.MotionActivityAvailable,
      ),
      InvokeCommandSpec(
        name = LittleBabyMotionCommand.Pedometer.rawValue,
        availability = InvokeCommandAvailability.MotionPedometerAvailable,
      ),
      InvokeCommandSpec(
        name = LittleBabySmsCommand.Send.rawValue,
        availability = InvokeCommandAvailability.SendSmsAvailable,
      ),
      InvokeCommandSpec(
        name = LittleBabySmsCommand.Search.rawValue,
        availability = InvokeCommandAvailability.RequestableSmsSearchAvailable,
      ),
      InvokeCommandSpec(
        name = LittleBabyCallLogCommand.Search.rawValue,
        availability = InvokeCommandAvailability.CallLogAvailable,
      ),
      InvokeCommandSpec(
        name = "debug.logs",
        availability = InvokeCommandAvailability.DebugBuild,
      ),
      InvokeCommandSpec(
        name = "debug.ed25519",
        availability = InvokeCommandAvailability.DebugBuild,
      ),
    )

  private val byNameInternal: Map<String, InvokeCommandSpec> = all.associateBy { it.name }

  fun find(command: String): InvokeCommandSpec? = byNameInternal[command]

  fun advertisedCapabilities(flags: NodeRuntimeFlags): List<String> {
    return capabilityManifest
      .filter { spec ->
        when (spec.availability) {
          NodeCapabilityAvailability.Always -> true
          NodeCapabilityAvailability.CameraEnabled -> flags.cameraEnabled
          NodeCapabilityAvailability.LocationEnabled -> flags.locationEnabled
          NodeCapabilityAvailability.SmsAvailable -> flags.sendSmsAvailable || flags.readSmsAvailable
          NodeCapabilityAvailability.CallLogAvailable -> flags.callLogAvailable
          NodeCapabilityAvailability.VoiceWakeEnabled -> flags.voiceWakeEnabled
          NodeCapabilityAvailability.MotionAvailable -> flags.motionActivityAvailable || flags.motionPedometerAvailable
        }
      }
      .map { it.name }
  }

  fun advertisedCommands(flags: NodeRuntimeFlags): List<String> {
    return all
      .filter { spec ->
        when (spec.availability) {
          InvokeCommandAvailability.Always -> true
          InvokeCommandAvailability.CameraEnabled -> flags.cameraEnabled
          InvokeCommandAvailability.LocationEnabled -> flags.locationEnabled
          InvokeCommandAvailability.SendSmsAvailable -> flags.sendSmsAvailable
          InvokeCommandAvailability.ReadSmsAvailable -> flags.readSmsAvailable
          InvokeCommandAvailability.RequestableSmsSearchAvailable -> flags.smsSearchPossible
          InvokeCommandAvailability.CallLogAvailable -> flags.callLogAvailable
          InvokeCommandAvailability.MotionActivityAvailable -> flags.motionActivityAvailable
          InvokeCommandAvailability.MotionPedometerAvailable -> flags.motionPedometerAvailable
          InvokeCommandAvailability.DebugBuild -> flags.debugBuild
        }
      }
      .map { it.name }
  }
}
