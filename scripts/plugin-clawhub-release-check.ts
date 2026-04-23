#!/usr/bin/env -S node --import tsx

import { pathToFileURL } from "node:url";
import {
  collectLittleBabyHubPublishablePluginPackages,
  collectLittleBabyHubVersionGateErrors,
  parsePluginReleaseArgs,
  resolveSelectedLittleBabyHubPublishablePluginPackages,
} from "./lib/plugin-littlebabyhub-release.ts";

export async function runPluginLittleBabyHubReleaseCheck(argv: string[]) {
  const { selection, selectionMode, baseRef, headRef } = parsePluginReleaseArgs(argv);
  const publishable = collectLittleBabyHubPublishablePluginPackages();
  const gitRange = baseRef && headRef ? { baseRef, headRef } : undefined;
  const selected = resolveSelectedLittleBabyHubPublishablePluginPackages({
    plugins: publishable,
    selection,
    selectionMode,
    gitRange,
  });

  if (gitRange) {
    const errors = collectLittleBabyHubVersionGateErrors({
      plugins: publishable,
      gitRange,
    });
    if (errors.length > 0) {
      throw new Error(
        `plugin-littlebabyhub-release-check: version bumps required before LittleBabyHub publish:\n${errors
          .map((error) => `  - ${error}`)
          .join("\n")}`,
      );
    }
  }

  console.log("plugin-littlebabyhub-release-check: publishable plugin metadata looks OK.");
  if (gitRange && selected.length === 0) {
    console.log(
      `  - no publishable plugin package changes detected between ${gitRange.baseRef} and ${gitRange.headRef}`,
    );
  }
  for (const plugin of selected) {
    console.log(
      `  - ${plugin.packageName}@${plugin.version} (${plugin.channel}, ${plugin.extensionId})`,
    );
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await runPluginLittleBabyHubReleaseCheck(process.argv.slice(2));
}
