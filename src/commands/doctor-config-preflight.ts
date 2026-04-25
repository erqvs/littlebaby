import { readConfigFileSnapshot } from "../config/io.js";
import { formatConfigIssueLines } from "../config/issue-format.js";
import type { LittleBabyConfig } from "../config/types.littlebaby.js";
import { note } from "../terminal/note.js";
import { noteIncludeConfinementWarning } from "./doctor-config-analysis.js";

export type DoctorConfigPreflightResult = {
  snapshot: Awaited<ReturnType<typeof readConfigFileSnapshot>>;
  baseConfig: LittleBabyConfig;
};

export async function runDoctorConfigPreflight(
  options: {
    migrateState?: boolean;
    migrateLegacyConfig?: boolean;
    invalidConfigNote?: string | false;
  } = {},
): Promise<DoctorConfigPreflightResult> {
  if (options.migrateState !== false) {
    const { autoMigrateLegacyStateDir } = await import("./doctor-state-migrations.js");
    const stateDirResult = await autoMigrateLegacyStateDir({ env: process.env });
    if (stateDirResult.changes.length > 0) {
      note(stateDirResult.changes.map((entry) => `- ${entry}`).join("\n"), "Doctor changes");
    }
    if (stateDirResult.warnings.length > 0) {
      note(stateDirResult.warnings.map((entry) => `- ${entry}`).join("\n"), "Doctor warnings");
    }
  }

  const snapshot = await readConfigFileSnapshot();
  const invalidConfigNote =
    options.invalidConfigNote ?? "Config invalid; doctor will run with best-effort config.";
  if (
    invalidConfigNote &&
    snapshot.exists &&
    !snapshot.valid &&
    snapshot.legacyIssues.length === 0
  ) {
    note(invalidConfigNote, "Config");
    noteIncludeConfinementWarning(snapshot);
  }

  const warnings = snapshot.warnings ?? [];
  if (warnings.length > 0) {
    note(formatConfigIssueLines(warnings, "-").join("\n"), "Config warnings");
  }

  return {
    snapshot,
    baseConfig: snapshot.sourceConfig ?? snapshot.config ?? {},
  };
}
