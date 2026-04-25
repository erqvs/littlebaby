import type { Command } from "commander";
import type { MessageCliHelpers } from "./helpers.js";

export function registerMessageSendCommand(message: Command, helpers: MessageCliHelpers) {
  helpers
    .withMessageBase(
      helpers
        .withRequiredMessageTarget(
          message
            .command("send")
            .description("Send a message")
            .option("-m, --message <text>", "Message body (required unless --media is set)"),
        )
        .option(
          "--media <path-or-url>",
          "Attach media (image/audio/video/document). Accepts local paths or URLs.",
        )
        .option("--reply-to <id>", "Reply-to Feishu message id"),
    )
    .action(async (opts) => {
      await helpers.runMessageAction("send", opts);
    });
}
