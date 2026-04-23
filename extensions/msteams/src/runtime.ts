import { createPluginRuntimeStore } from "littlebaby/plugin-sdk/runtime-store";
import type { PluginRuntime } from "littlebaby/plugin-sdk/runtime-store";

const { setRuntime: setMSTeamsRuntime, getRuntime: getMSTeamsRuntime } =
  createPluginRuntimeStore<PluginRuntime>({
    pluginId: "msteams",
    errorMessage: "MSTeams runtime not initialized",
  });
export { getMSTeamsRuntime, setMSTeamsRuntime };
