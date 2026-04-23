export type InstallRecordBase = {
  source: "npm" | "archive" | "path" | "littlebabyhub";
  spec?: string;
  sourcePath?: string;
  installPath?: string;
  version?: string;
  resolvedName?: string;
  resolvedVersion?: string;
  resolvedSpec?: string;
  integrity?: string;
  shasum?: string;
  resolvedAt?: string;
  installedAt?: string;
  littlebabyhubUrl?: string;
  littlebabyhubPackage?: string;
  littlebabyhubFamily?: "code-plugin" | "bundle-plugin";
  littlebabyhubChannel?: "official" | "community" | "private";
};
