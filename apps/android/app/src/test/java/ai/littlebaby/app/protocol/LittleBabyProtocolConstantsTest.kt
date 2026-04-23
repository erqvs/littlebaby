package ai.littlebaby.app.protocol

import org.junit.Assert.assertEquals
import org.junit.Test

class LittleBabyProtocolConstantsTest {
  @Test
  fun canvasCommandsUseStableStrings() {
    assertEquals("canvas.present", LittleBabyCanvasCommand.Present.rawValue)
    assertEquals("canvas.hide", LittleBabyCanvasCommand.Hide.rawValue)
    assertEquals("canvas.navigate", LittleBabyCanvasCommand.Navigate.rawValue)
    assertEquals("canvas.eval", LittleBabyCanvasCommand.Eval.rawValue)
    assertEquals("canvas.snapshot", LittleBabyCanvasCommand.Snapshot.rawValue)
  }

  @Test
  fun a2uiCommandsUseStableStrings() {
    assertEquals("canvas.a2ui.push", LittleBabyCanvasA2UICommand.Push.rawValue)
    assertEquals("canvas.a2ui.pushJSONL", LittleBabyCanvasA2UICommand.PushJSONL.rawValue)
    assertEquals("canvas.a2ui.reset", LittleBabyCanvasA2UICommand.Reset.rawValue)
  }

  @Test
  fun capabilitiesUseStableStrings() {
    assertEquals("canvas", LittleBabyCapability.Canvas.rawValue)
    assertEquals("camera", LittleBabyCapability.Camera.rawValue)
    assertEquals("voiceWake", LittleBabyCapability.VoiceWake.rawValue)
    assertEquals("location", LittleBabyCapability.Location.rawValue)
    assertEquals("sms", LittleBabyCapability.Sms.rawValue)
    assertEquals("device", LittleBabyCapability.Device.rawValue)
    assertEquals("notifications", LittleBabyCapability.Notifications.rawValue)
    assertEquals("system", LittleBabyCapability.System.rawValue)
    assertEquals("photos", LittleBabyCapability.Photos.rawValue)
    assertEquals("contacts", LittleBabyCapability.Contacts.rawValue)
    assertEquals("calendar", LittleBabyCapability.Calendar.rawValue)
    assertEquals("motion", LittleBabyCapability.Motion.rawValue)
    assertEquals("callLog", LittleBabyCapability.CallLog.rawValue)
  }

  @Test
  fun cameraCommandsUseStableStrings() {
    assertEquals("camera.list", LittleBabyCameraCommand.List.rawValue)
    assertEquals("camera.snap", LittleBabyCameraCommand.Snap.rawValue)
    assertEquals("camera.clip", LittleBabyCameraCommand.Clip.rawValue)
  }

  @Test
  fun notificationsCommandsUseStableStrings() {
    assertEquals("notifications.list", LittleBabyNotificationsCommand.List.rawValue)
    assertEquals("notifications.actions", LittleBabyNotificationsCommand.Actions.rawValue)
  }

  @Test
  fun deviceCommandsUseStableStrings() {
    assertEquals("device.status", LittleBabyDeviceCommand.Status.rawValue)
    assertEquals("device.info", LittleBabyDeviceCommand.Info.rawValue)
    assertEquals("device.permissions", LittleBabyDeviceCommand.Permissions.rawValue)
    assertEquals("device.health", LittleBabyDeviceCommand.Health.rawValue)
  }

  @Test
  fun systemCommandsUseStableStrings() {
    assertEquals("system.notify", LittleBabySystemCommand.Notify.rawValue)
  }

  @Test
  fun photosCommandsUseStableStrings() {
    assertEquals("photos.latest", LittleBabyPhotosCommand.Latest.rawValue)
  }

  @Test
  fun contactsCommandsUseStableStrings() {
    assertEquals("contacts.search", LittleBabyContactsCommand.Search.rawValue)
    assertEquals("contacts.add", LittleBabyContactsCommand.Add.rawValue)
  }

  @Test
  fun calendarCommandsUseStableStrings() {
    assertEquals("calendar.events", LittleBabyCalendarCommand.Events.rawValue)
    assertEquals("calendar.add", LittleBabyCalendarCommand.Add.rawValue)
  }

  @Test
  fun motionCommandsUseStableStrings() {
    assertEquals("motion.activity", LittleBabyMotionCommand.Activity.rawValue)
    assertEquals("motion.pedometer", LittleBabyMotionCommand.Pedometer.rawValue)
  }

  @Test
  fun smsCommandsUseStableStrings() {
    assertEquals("sms.send", LittleBabySmsCommand.Send.rawValue)
    assertEquals("sms.search", LittleBabySmsCommand.Search.rawValue)
  }

  @Test
  fun callLogCommandsUseStableStrings() {
    assertEquals("callLog.search", LittleBabyCallLogCommand.Search.rawValue)
  }

}
