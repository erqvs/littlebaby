import {
  defineBundledChannelEntry,
  loadBundledEntryExportSync,
} from "littlebaby/plugin-sdk/channel-entry-contract";
import type { LittleBabyPluginApi } from "littlebaby/plugin-sdk/channel-entry-contract";

function registerSlackPluginHttpRoutes(api: LittleBabyPluginApi): void {
  const register = loadBundledEntryExportSync<(api: LittleBabyPluginApi) => void>(import.meta.url, {
    specifier: "./runtime-api.js",
    exportName: "registerSlackPluginHttpRoutes",
  });
  register(api);
}

export default defineBundledChannelEntry({
  id: "slack",
  name: "Slack",
  description: "Slack channel plugin",
  importMetaUrl: import.meta.url,
  plugin: {
    specifier: "./channel-plugin-api.js",
    exportName: "slackPlugin",
  },
  secrets: {
    specifier: "./secret-contract-api.js",
    exportName: "channelSecrets",
  },
  runtime: {
    specifier: "./runtime-api.js",
    exportName: "setSlackRuntime",
  },
  accountInspect: {
    specifier: "./account-inspect-api.js",
    exportName: "inspectSlackReadOnlyAccount",
  },
  registerFull: registerSlackPluginHttpRoutes,
});
