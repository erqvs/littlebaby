package ai.littlebaby.app.voice

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class VoiceWakeCommandExtractorTest {
  @Test
  fun extractsCommandAfterTriggerWord() {
    val res = VoiceWakeCommandExtractor.extractCommand("Claude take a photo", listOf("littlebaby", "claude"))
    assertEquals("take a photo", res)
  }

  @Test
  fun extractsCommandWithPunctuation() {
    val res = VoiceWakeCommandExtractor.extractCommand("hey littlebaby, what's the weather?", listOf("littlebaby"))
    assertEquals("what's the weather?", res)
  }

  @Test
  fun returnsNullWhenNoCommandProvided() {
    assertNull(VoiceWakeCommandExtractor.extractCommand("claude", listOf("claude")))
    assertNull(VoiceWakeCommandExtractor.extractCommand("hey claude!", listOf("claude")))
  }
}
