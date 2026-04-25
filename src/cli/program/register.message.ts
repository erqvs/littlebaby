import type { Command } from "commander";
import { formatDocsLink } from "../../terminal/links.js";
import { theme } from "../../terminal/theme.js";
import { formatHelpExamples } from "../help-format.js";
import type { ProgramContext } from "./context.js";
import { createMessageCliHelpers } from "./message/helpers.js";
import { registerMessageSendCommand } from "./message/register.send.js";

export function registerMessageCommands(program: Command, ctx: ProgramContext) {
  const message = program
    .command("message")
    .description("Send Feishu messages")
    .addHelpText(
      "after",
      () =>
        `
${theme.heading("Examples:")}
${formatHelpExamples([
  [
    'littlebaby message send --channel feishu --target <feishu-target> --message "Hi"',
    "Send a Feishu text message.",
  ],
  [
    'littlebaby message send --channel feishu --target <feishu-target> --message "Hi" --media photo.jpg',
    "Send a Feishu message with media.",
  ],
])}

${theme.muted("Docs:")} ${formatDocsLink("/cli/message", "docs.littlebaby.ai/cli/message")}`,
    )
    .action(() => {
      message.help({ error: true });
    });

  const helpers = createMessageCliHelpers(message, ctx.messageChannelOptions);
  registerMessageSendCommand(message, helpers);
}
