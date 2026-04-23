import type { PluginRuntime } from "littlebaby/plugin-sdk/core";
import { createPluginRuntimeStore } from "littlebaby/plugin-sdk/runtime-store";

const { setRuntime: setQQBotRuntime, getRuntime: getQQBotRuntime } =
  createPluginRuntimeStore<PluginRuntime>({
    pluginId: "qqbot",
    errorMessage: "QQBot runtime not initialized",
  });
export { getQQBotRuntime, setQQBotRuntime };
