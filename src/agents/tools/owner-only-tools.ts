export const LITTLEBABY_OWNER_ONLY_CORE_TOOL_NAMES = ["cron", "gateway", "nodes"] as const;

const LITTLEBABY_OWNER_ONLY_CORE_TOOL_NAME_SET: ReadonlySet<string> = new Set(
  LITTLEBABY_OWNER_ONLY_CORE_TOOL_NAMES,
);

export function isOpenClawOwnerOnlyCoreToolName(toolName: string): boolean {
  return LITTLEBABY_OWNER_ONLY_CORE_TOOL_NAME_SET.has(toolName);
}
