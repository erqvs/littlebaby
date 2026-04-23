import { definePluginEntry, type LittleBabyPluginApi } from "./runtime-api.js";

export default definePluginEntry({
  id: "open-prose",
  name: "OpenProse",
  description: "Plugin-shipped prose skills bundle",
  register(_api: LittleBabyPluginApi) {
    // OpenProse is delivered via plugin-shipped skills.
  },
});
