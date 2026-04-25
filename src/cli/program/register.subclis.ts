import type { Command } from "commander";
import {
  registerSubCliByName as registerSubCliByNameCore,
  registerSubCliCommands as registerSubCliCommandsCore,
} from "./register.subclis-core.js";
import {
  getSubCliCommandsWithSubcommands,
  getSubCliEntries as getSubCliEntryDescriptors,
  type SubCliDescriptor,
} from "./subcli-descriptors.js";

export { getSubCliCommandsWithSubcommands };

export function getSubCliEntries(): ReadonlyArray<SubCliDescriptor> {
  return getSubCliEntryDescriptors();
}

export async function registerSubCliByName(program: Command, name: string): Promise<boolean> {
  return registerSubCliByNameCore(program, name);
}

export function registerSubCliCommands(program: Command, argv: string[] = process.argv) {
  registerSubCliCommandsCore(program, argv);
}
