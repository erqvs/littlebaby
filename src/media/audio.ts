import { normalizeOptionalString } from "../shared/string-coerce.js";
import { getFileExtension, normalizeMimeType } from "./mime.js";

export const VOICE_AUDIO_EXTENSIONS = new Set([".oga", ".ogg", ".opus", ".mp3", ".m4a"]);

/**
 * MIME types compatible with voice messages.
 * Common chat voice transports support OGG/Opus, MP3, and M4A.
 */
export const VOICE_MIME_TYPES = new Set([
  "audio/ogg",
  "audio/opus",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
]);

export function isVoiceFormatCompatibleAudio(opts: {
  contentType?: string | null;
  fileName?: string | null;
}): boolean {
  const mime = normalizeMimeType(opts.contentType);
  if (mime && VOICE_MIME_TYPES.has(mime)) {
    return true;
  }
  const fileName = normalizeOptionalString(opts.fileName);
  if (!fileName) {
    return false;
  }
  const ext = getFileExtension(fileName);
  if (!ext) {
    return false;
  }
  return VOICE_AUDIO_EXTENSIONS.has(ext);
}

/**
 * Backward-compatible alias used across plugin/runtime call sites.
 */
export function isVoiceCompatibleAudio(opts: {
  contentType?: string | null;
  fileName?: string | null;
}): boolean {
  return isVoiceFormatCompatibleAudio(opts);
}
