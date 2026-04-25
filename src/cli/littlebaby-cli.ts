import type { Command } from "commander";
import { formatDocsLink } from "../terminal/links.js";
import { theme } from "../terminal/theme.js";
import { registerQrCli } from "./qr-cli.js";

export function registerLittlebabyCli(program: Command) {
  const littlebaby = program
    .command("littlebaby")
    .description("Legacy littlebaby command aliases")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/littlebaby", "docs.littlebaby.ai/cli/littlebaby")}\n`,
    );
  registerQrCli(littlebaby);
}
