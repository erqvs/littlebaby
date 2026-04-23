export type { LittleBabyConfig } from "littlebaby/plugin-sdk/memory-core";
export type {
  MemoryEmbeddingProbeResult,
  MemoryProviderStatus,
  MemorySyncProgressUpdate,
} from "littlebaby/plugin-sdk/memory-core-host-engine-storage";
export {
  dedupeDreamDiaryEntries,
  removeBackfillDiaryEntries,
  writeBackfillDiaryEntries,
} from "./src/dreaming-narrative.js";
export { previewGroundedRemMarkdown } from "./src/rem-evidence.js";
