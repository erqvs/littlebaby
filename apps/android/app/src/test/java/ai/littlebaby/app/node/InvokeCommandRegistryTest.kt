package ai.littlebaby.app.node

import ai.littlebaby.app.protocol.LittleBabyCalendarCommand
import ai.littlebaby.app.protocol.LittleBabyCameraCommand
import ai.littlebaby.app.protocol.LittleBabyCallLogCommand
import ai.littlebaby.app.protocol.LittleBabyCapability
import ai.littlebaby.app.protocol.LittleBabyContactsCommand
import ai.littlebaby.app.protocol.LittleBabyDeviceCommand
import ai.littlebaby.app.protocol.LittleBabyLocationCommand
import ai.littlebaby.app.protocol.LittleBabyMotionCommand
import ai.littlebaby.app.protocol.LittleBabyNotificationsCommand
import ai.littlebaby.app.protocol.LittleBabyPhotosCommand
import ai.littlebaby.app.protocol.LittleBabySmsCommand
import ai.littlebaby.app.protocol.LittleBabySystemCommand
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class InvokeCommandRegistryTest {
  private val coreCapabilities =
    setOf(
      LittleBabyCapability.Canvas.rawValue,
      LittleBabyCapability.Device.rawValue,
      LittleBabyCapability.Notifications.rawValue,
      LittleBabyCapability.System.rawValue,
      LittleBabyCapability.Photos.rawValue,
      LittleBabyCapability.Contacts.rawValue,
      LittleBabyCapability.Calendar.rawValue,
    )

  private val optionalCapabilities =
    setOf(
      LittleBabyCapability.Camera.rawValue,
      LittleBabyCapability.Location.rawValue,
      LittleBabyCapability.Sms.rawValue,
      LittleBabyCapability.CallLog.rawValue,
      LittleBabyCapability.VoiceWake.rawValue,
      LittleBabyCapability.Motion.rawValue,
    )

  private val coreCommands =
    setOf(
      LittleBabyDeviceCommand.Status.rawValue,
      LittleBabyDeviceCommand.Info.rawValue,
      LittleBabyDeviceCommand.Permissions.rawValue,
      LittleBabyDeviceCommand.Health.rawValue,
      LittleBabyNotificationsCommand.List.rawValue,
      LittleBabyNotificationsCommand.Actions.rawValue,
      LittleBabySystemCommand.Notify.rawValue,
      LittleBabyPhotosCommand.Latest.rawValue,
      LittleBabyContactsCommand.Search.rawValue,
      LittleBabyContactsCommand.Add.rawValue,
      LittleBabyCalendarCommand.Events.rawValue,
      LittleBabyCalendarCommand.Add.rawValue,
    )

  private val optionalCommands =
    setOf(
      LittleBabyCameraCommand.Snap.rawValue,
      LittleBabyCameraCommand.Clip.rawValue,
      LittleBabyCameraCommand.List.rawValue,
      LittleBabyLocationCommand.Get.rawValue,
      LittleBabyMotionCommand.Activity.rawValue,
      LittleBabyMotionCommand.Pedometer.rawValue,
      LittleBabySmsCommand.Send.rawValue,
      LittleBabySmsCommand.Search.rawValue,
      LittleBabyCallLogCommand.Search.rawValue,
    )

  private val debugCommands = setOf("debug.logs", "debug.ed25519")

  @Test
  fun advertisedCapabilities_respectsFeatureAvailability() {
    val capabilities = InvokeCommandRegistry.advertisedCapabilities(defaultFlags())

    assertContainsAll(capabilities, coreCapabilities)
    assertMissingAll(capabilities, optionalCapabilities)
  }

  @Test
  fun advertisedCapabilities_includesFeatureCapabilitiesWhenEnabled() {
    val capabilities =
      InvokeCommandRegistry.advertisedCapabilities(
        defaultFlags(
          cameraEnabled = true,
          locationEnabled = true,
          sendSmsAvailable = true,
          readSmsAvailable = true,
          smsSearchPossible = true,
          callLogAvailable = true,
          voiceWakeEnabled = true,
          motionActivityAvailable = true,
          motionPedometerAvailable = true,
        ),
      )

    assertContainsAll(capabilities, coreCapabilities + optionalCapabilities)
  }

  @Test
  fun advertisedCommands_respectsFeatureAvailability() {
    val commands = InvokeCommandRegistry.advertisedCommands(defaultFlags())

    assertContainsAll(commands, coreCommands)
    assertMissingAll(commands, optionalCommands + debugCommands)
  }

  @Test
  fun advertisedCommands_includesFeatureCommandsWhenEnabled() {
    val commands =
      InvokeCommandRegistry.advertisedCommands(
        defaultFlags(
          cameraEnabled = true,
          locationEnabled = true,
          sendSmsAvailable = true,
          readSmsAvailable = true,
          smsSearchPossible = true,
          callLogAvailable = true,
          motionActivityAvailable = true,
          motionPedometerAvailable = true,
          debugBuild = true,
        ),
      )

    assertContainsAll(commands, coreCommands + optionalCommands + debugCommands)
  }

  @Test
  fun advertisedCommands_onlyIncludesSupportedMotionCommands() {
    val commands =
      InvokeCommandRegistry.advertisedCommands(
        NodeRuntimeFlags(
          cameraEnabled = false,
          locationEnabled = false,
          sendSmsAvailable = false,
          readSmsAvailable = false,
          smsSearchPossible = false,
          callLogAvailable = false,
          voiceWakeEnabled = false,
          motionActivityAvailable = true,
          motionPedometerAvailable = false,
          debugBuild = false,
        ),
      )

    assertTrue(commands.contains(LittleBabyMotionCommand.Activity.rawValue))
    assertFalse(commands.contains(LittleBabyMotionCommand.Pedometer.rawValue))
  }

  @Test
  fun advertisedCommands_splitsSmsSendAndSearchAvailability() {
    val readOnlyCommands =
      InvokeCommandRegistry.advertisedCommands(
        defaultFlags(readSmsAvailable = true, smsSearchPossible = true),
      )
    val sendOnlyCommands =
      InvokeCommandRegistry.advertisedCommands(
        defaultFlags(sendSmsAvailable = true),
      )
    val requestableSearchCommands =
      InvokeCommandRegistry.advertisedCommands(
        defaultFlags(smsSearchPossible = true),
      )

    assertTrue(readOnlyCommands.contains(LittleBabySmsCommand.Search.rawValue))
    assertFalse(readOnlyCommands.contains(LittleBabySmsCommand.Send.rawValue))
    assertTrue(sendOnlyCommands.contains(LittleBabySmsCommand.Send.rawValue))
    assertFalse(sendOnlyCommands.contains(LittleBabySmsCommand.Search.rawValue))
    assertTrue(requestableSearchCommands.contains(LittleBabySmsCommand.Search.rawValue))
  }

  @Test
  fun advertisedCapabilities_includeSmsWhenEitherSmsPathIsAvailable() {
    val readOnlyCapabilities =
      InvokeCommandRegistry.advertisedCapabilities(
        defaultFlags(readSmsAvailable = true),
      )
    val sendOnlyCapabilities =
      InvokeCommandRegistry.advertisedCapabilities(
        defaultFlags(sendSmsAvailable = true),
      )
    val requestableSearchCapabilities =
      InvokeCommandRegistry.advertisedCapabilities(
        defaultFlags(smsSearchPossible = true),
      )

    assertTrue(readOnlyCapabilities.contains(LittleBabyCapability.Sms.rawValue))
    assertTrue(sendOnlyCapabilities.contains(LittleBabyCapability.Sms.rawValue))
    assertFalse(requestableSearchCapabilities.contains(LittleBabyCapability.Sms.rawValue))
  }

  @Test
  fun advertisedCommands_excludesCallLogWhenUnavailable() {
    val commands = InvokeCommandRegistry.advertisedCommands(defaultFlags(callLogAvailable = false))

    assertFalse(commands.contains(LittleBabyCallLogCommand.Search.rawValue))
  }

  @Test
  fun advertisedCapabilities_excludesCallLogWhenUnavailable() {
    val capabilities = InvokeCommandRegistry.advertisedCapabilities(defaultFlags(callLogAvailable = false))

    assertFalse(capabilities.contains(LittleBabyCapability.CallLog.rawValue))
  }

  @Test
  fun advertisedCapabilities_includesVoiceWakeWithoutAdvertisingCommands() {
    val capabilities = InvokeCommandRegistry.advertisedCapabilities(defaultFlags(voiceWakeEnabled = true))
    val commands = InvokeCommandRegistry.advertisedCommands(defaultFlags(voiceWakeEnabled = true))

    assertTrue(capabilities.contains(LittleBabyCapability.VoiceWake.rawValue))
    assertFalse(commands.any { it.contains("voice", ignoreCase = true) })
  }

  @Test
  fun find_returnsForegroundMetadataForCameraCommands() {
    val list = InvokeCommandRegistry.find(LittleBabyCameraCommand.List.rawValue)
    val location = InvokeCommandRegistry.find(LittleBabyLocationCommand.Get.rawValue)

    assertNotNull(list)
    assertEquals(true, list?.requiresForeground)
    assertNotNull(location)
    assertEquals(false, location?.requiresForeground)
  }

  @Test
  fun find_returnsNullForUnknownCommand() {
    assertNull(InvokeCommandRegistry.find("not.real"))
  }

  private fun defaultFlags(
    cameraEnabled: Boolean = false,
    locationEnabled: Boolean = false,
    sendSmsAvailable: Boolean = false,
    readSmsAvailable: Boolean = false,
    smsSearchPossible: Boolean = false,
    callLogAvailable: Boolean = false,
    voiceWakeEnabled: Boolean = false,
    motionActivityAvailable: Boolean = false,
    motionPedometerAvailable: Boolean = false,
    debugBuild: Boolean = false,
  ): NodeRuntimeFlags =
    NodeRuntimeFlags(
      cameraEnabled = cameraEnabled,
      locationEnabled = locationEnabled,
      sendSmsAvailable = sendSmsAvailable,
      readSmsAvailable = readSmsAvailable,
      smsSearchPossible = smsSearchPossible,
      callLogAvailable = callLogAvailable,
      voiceWakeEnabled = voiceWakeEnabled,
      motionActivityAvailable = motionActivityAvailable,
      motionPedometerAvailable = motionPedometerAvailable,
      debugBuild = debugBuild,
    )

  private fun assertContainsAll(actual: List<String>, expected: Set<String>) {
    expected.forEach { value -> assertTrue(actual.contains(value)) }
  }

  private fun assertMissingAll(actual: List<String>, forbidden: Set<String>) {
    forbidden.forEach { value -> assertFalse(actual.contains(value)) }
  }
}
