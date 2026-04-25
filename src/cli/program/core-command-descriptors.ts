import { defineCommandDescriptorCatalog } from "./command-descriptor-utils.js";
import type { NamedCommandDescriptor } from "./command-group-descriptors.js";

export type CoreCliCommandDescriptor = NamedCommandDescriptor;

const coreCliCommandCatalog = defineCommandDescriptorCatalog([
  {
    name: "config",
    description: "Non-interactive config helpers (get/set/unset/file/validate).",
    hasSubcommands: true,
  },
  {
    name: "backup",
    description: "Create and verify local backup archives for LittleBaby state",
    hasSubcommands: true,
  },
  {
    name: "message",
    description: "Send Feishu messages",
    hasSubcommands: true,
  },
  {
    name: "mcp",
    description: "Manage LittleBaby MCP config and channel bridge",
    hasSubcommands: true,
  },
  {
    name: "agent",
    description: "Run one agent turn via the Gateway",
    hasSubcommands: false,
  },
  {
    name: "agents",
    description: "Manage isolated agents (workspaces, auth, routing)",
    hasSubcommands: true,
  },
  {
    name: "status",
    description: "Show Feishu/gateway health and recent session recipients",
    hasSubcommands: false,
  },
  {
    name: "health",
    description: "Fetch health from the running gateway",
    hasSubcommands: false,
  },
  {
    name: "sessions",
    description: "List stored conversation sessions",
    hasSubcommands: true,
  },
  {
    name: "tasks",
    description: "Inspect durable background task state",
    hasSubcommands: true,
  },
] as const satisfies ReadonlyArray<CoreCliCommandDescriptor>);

export const CORE_CLI_COMMAND_DESCRIPTORS = coreCliCommandCatalog.descriptors;

export function getCoreCliCommandDescriptors(): ReadonlyArray<CoreCliCommandDescriptor> {
  return coreCliCommandCatalog.getDescriptors();
}

export function getCoreCliCommandNames(): string[] {
  return coreCliCommandCatalog.getNames();
}

export function getCoreCliCommandsWithSubcommands(): string[] {
  return coreCliCommandCatalog.getCommandsWithSubcommands();
}
