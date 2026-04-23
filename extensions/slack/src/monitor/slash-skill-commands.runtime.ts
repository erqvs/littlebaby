import { listSkillCommandsForAgents as listSkillCommandsForAgentsImpl } from "littlebaby/plugin-sdk/command-auth";

type ListSkillCommandsForAgents =
  typeof import("littlebaby/plugin-sdk/command-auth").listSkillCommandsForAgents;

export function listSkillCommandsForAgents(
  ...args: Parameters<ListSkillCommandsForAgents>
): ReturnType<ListSkillCommandsForAgents> {
  return listSkillCommandsForAgentsImpl(...args);
}
