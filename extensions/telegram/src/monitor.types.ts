import type { ChannelRuntimeSurface } from "littlebaby/plugin-sdk/channel-contract";
import type { LittleBabyConfig } from "littlebaby/plugin-sdk/config-runtime";
import type { RuntimeEnv } from "littlebaby/plugin-sdk/runtime-env";

export type MonitorTelegramOpts = {
  token?: string;
  accountId?: string;
  config?: LittleBabyConfig;
  runtime?: RuntimeEnv;
  channelRuntime?: ChannelRuntimeSurface;
  abortSignal?: AbortSignal;
  useWebhook?: boolean;
  webhookPath?: string;
  webhookPort?: number;
  webhookSecret?: string;
  webhookHost?: string;
  proxyFetch?: typeof fetch;
  webhookUrl?: string;
  webhookCertPath?: string;
};

export type TelegramMonitorFn = (opts?: MonitorTelegramOpts) => Promise<void>;
