import { defineSetupPluginEntry } from "littlebaby/plugin-sdk/channel-core";
import { qaChannelPlugin } from "./src/channel.js";

export default defineSetupPluginEntry(qaChannelPlugin);
