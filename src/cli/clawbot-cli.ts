import type { Command } from "commander";
import { formatDocsLink } from "../terminal/links.js";
import { theme } from "../terminal/theme.js";
import { registerQrCli } from "./qr-cli.js";

export function registerLittlebabybotCli(program: Command) {
  const littlebabybot = program
    .command("littlebabybot")
    .description("Legacy littlebabybot command aliases")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/littlebabybot", "docs.littlebaby.ai/cli/littlebabybot")}\n`,
    );
  registerQrCli(littlebabybot);
}
