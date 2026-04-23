export const LITTLEBABY_CLI_ENV_VAR = "LITTLEBABY_CLI";
export const LITTLEBABY_CLI_ENV_VALUE = "1";

export function markLittleBabyExecEnv<T extends Record<string, string | undefined>>(env: T): T {
  return {
    ...env,
    [LITTLEBABY_CLI_ENV_VAR]: LITTLEBABY_CLI_ENV_VALUE,
  };
}

export function ensureLittleBabyExecMarkerOnProcess(
  env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  env[LITTLEBABY_CLI_ENV_VAR] = LITTLEBABY_CLI_ENV_VALUE;
  return env;
}
