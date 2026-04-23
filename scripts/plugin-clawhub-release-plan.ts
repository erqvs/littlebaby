#!/usr/bin/env -S node --import tsx

import { pathToFileURL } from "node:url";
import {
  collectPluginLittleBabyHubReleasePlan,
  parsePluginReleaseArgs,
} from "./lib/plugin-littlebabyhub-release.ts";

export async function collectPluginReleasePlanForLittleBabyHub(argv: string[]) {
  const { selection, selectionMode, baseRef, headRef } = parsePluginReleaseArgs(argv);
  return await collectPluginLittleBabyHubReleasePlan({
    selection,
    selectionMode,
    gitRange: baseRef && headRef ? { baseRef, headRef } : undefined,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const plan = await collectPluginReleasePlanForLittleBabyHub(process.argv.slice(2));
  console.log(JSON.stringify(plan, null, 2));
}
