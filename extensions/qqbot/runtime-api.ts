export type { ChannelPlugin, LittleBabyPluginApi, PluginRuntime } from "littlebaby/plugin-sdk/core";
export type { LittleBabyConfig } from "littlebaby/plugin-sdk/config-runtime";
export type {
  LittleBabyPluginService,
  LittleBabyPluginServiceContext,
  PluginLogger,
} from "littlebaby/plugin-sdk/core";
export type { ResolvedQQBotAccount, QQBotAccountConfig } from "./src/types.js";
export { getQQBotRuntime, setQQBotRuntime } from "./src/runtime.js";
