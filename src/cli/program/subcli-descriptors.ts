import { defineCommandDescriptorCatalog } from "./command-descriptor-utils.js";
import type { NamedCommandDescriptor } from "./command-group-descriptors.js";
import { isPrivateQaCliEnabled } from "./private-qa-cli.js";

export type SubCliDescriptor = NamedCommandDescriptor;

const subCliCommandCatalog = defineCommandDescriptorCatalog([
  {
    name: "gateway",
    description: "Run, inspect, and query the WebSocket Gateway",
    hasSubcommands: true,
  },
  { name: "logs", description: "Tail gateway file logs via RPC", hasSubcommands: false },
  {
    name: "models",
    description: "Discover, scan, and configure models",
    hasSubcommands: true,
  },
  {
    name: "directory",
    description: "Lookup Feishu contact and group IDs",
    hasSubcommands: true,
  },
] as const satisfies ReadonlyArray<SubCliDescriptor>);

export const SUB_CLI_DESCRIPTORS = subCliCommandCatalog.descriptors;

export function getSubCliEntries(): ReadonlyArray<SubCliDescriptor> {
  const descriptors = subCliCommandCatalog.getDescriptors();
  if (isPrivateQaCliEnabled()) {
    return descriptors;
  }
  return descriptors.filter((descriptor) => descriptor.name !== "qa");
}

export function getSubCliCommandsWithSubcommands(): string[] {
  const commands = subCliCommandCatalog.getCommandsWithSubcommands();
  if (isPrivateQaCliEnabled()) {
    return commands;
  }
  return commands.filter((command) => command !== "qa");
}
