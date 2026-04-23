import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import JSZip from "jszip";
import {
  DEFAULT_MAX_ARCHIVE_BYTES_ZIP,
  DEFAULT_MAX_ENTRIES,
  DEFAULT_MAX_EXTRACTED_BYTES,
  DEFAULT_MAX_ENTRY_BYTES,
} from "../infra/archive.js";
import {
  LittleBabyHubRequestError,
  downloadLittleBabyHubPackageArchive,
  fetchLittleBabyHubPackageDetail,
  fetchLittleBabyHubPackageVersion,
  normalizeLittleBabyHubSha256Integrity,
  normalizeLittleBabyHubSha256Hex,
  parseLittleBabyHubPluginSpec,
  resolveLatestVersionFromPackage,
  satisfiesGatewayMinimum,
  satisfiesPluginApiRange,
  type LittleBabyHubPackageChannel,
  type LittleBabyHubPackageCompatibility,
  type LittleBabyHubPackageDetail,
  type LittleBabyHubPackageFamily,
  type LittleBabyHubPackageVersion,
} from "../infra/littlebabyhub.js";
import { formatErrorMessage } from "../infra/errors.js";
import { normalizeOptionalString } from "../shared/string-coerce.js";
import { resolveCompatibilityHostVersion } from "../version.js";
import type { InstallSafetyOverrides } from "./install-security-scan.js";
import { installPluginFromArchive, type InstallPluginResult } from "./install.js";

export const LITTLEBABYHUB_INSTALL_ERROR_CODE = {
  INVALID_SPEC: "invalid_spec",
  PACKAGE_NOT_FOUND: "package_not_found",
  VERSION_NOT_FOUND: "version_not_found",
  NO_INSTALLABLE_VERSION: "no_installable_version",
  SKILL_PACKAGE: "skill_package",
  UNSUPPORTED_FAMILY: "unsupported_family",
  PRIVATE_PACKAGE: "private_package",
  INCOMPATIBLE_PLUGIN_API: "incompatible_plugin_api",
  INCOMPATIBLE_GATEWAY: "incompatible_gateway",
  MISSING_ARCHIVE_INTEGRITY: "missing_archive_integrity",
  ARCHIVE_INTEGRITY_MISMATCH: "archive_integrity_mismatch",
} as const;

export type LittleBabyHubInstallErrorCode =
  (typeof LITTLEBABYHUB_INSTALL_ERROR_CODE)[keyof typeof LITTLEBABYHUB_INSTALL_ERROR_CODE];

type PluginInstallLogger = {
  info?: (message: string) => void;
  warn?: (message: string) => void;
};

export type LittleBabyHubPluginInstallRecordFields = {
  source: "littlebabyhub";
  littlebabyhubUrl: string;
  littlebabyhubPackage: string;
  littlebabyhubFamily: Exclude<LittleBabyHubPackageFamily, "skill">;
  littlebabyhubChannel?: LittleBabyHubPackageChannel;
  version?: string;
  integrity?: string;
  resolvedAt?: string;
  installedAt?: string;
};

type LittleBabyHubInstallFailure = {
  ok: false;
  error: string;
  code?: LittleBabyHubInstallErrorCode;
};

type LittleBabyHubFileEntryLike = {
  path?: unknown;
  sha256?: unknown;
};

type LittleBabyHubFileVerificationEntry = {
  path: string;
  sha256: string;
};

type LittleBabyHubArchiveVerification =
  | {
      kind: "archive-integrity";
      integrity: string;
    }
  | {
      kind: "file-list";
      files: LittleBabyHubFileVerificationEntry[];
    };

type LittleBabyHubArchiveVerificationResolution =
  | {
      ok: true;
      verification: LittleBabyHubArchiveVerification | null;
    }
  | LittleBabyHubInstallFailure;

type LittleBabyHubArchiveFileVerificationResult =
  | {
      ok: true;
      validatedGeneratedPaths: string[];
    }
  | LittleBabyHubInstallFailure;

type JSZipObjectWithSize = JSZip.JSZipObject & {
  // Internal JSZip field from loadAsync() metadata. Use it only as a best-effort
  // size hint; the streaming byte checks below are the authoritative guard.
  _data?: {
    uncompressedSize?: number;
  };
};

const LITTLEBABYHUB_GENERATED_ARCHIVE_METADATA_FILE = "_meta.json";

type LittleBabyHubArchiveEntryLimits = {
  maxEntryBytes: number;
  addArchiveBytes: (bytes: number) => boolean;
};

export function formatLittleBabyHubSpecifier(params: { name: string; version?: string }): string {
  return `littlebabyhub:${params.name}${params.version ? `@${params.version}` : ""}`;
}

function buildLittleBabyHubInstallFailure(
  error: string,
  code?: LittleBabyHubInstallErrorCode,
): LittleBabyHubInstallFailure {
  return { ok: false, error, code };
}

function isLittleBabyHubInstallFailure(value: unknown): value is LittleBabyHubInstallFailure {
  return Boolean(
    value &&
    typeof value === "object" &&
    "ok" in value &&
    (value as { ok?: unknown }).ok === false &&
    "error" in value,
  );
}

function mapLittleBabyHubRequestError(
  error: unknown,
  context: { stage: "package" | "version"; name: string; version?: string },
): LittleBabyHubInstallFailure {
  if (error instanceof LittleBabyHubRequestError && error.status === 404) {
    if (context.stage === "package") {
      return buildLittleBabyHubInstallFailure(
        "Package not found on LittleBabyHub.",
        LITTLEBABYHUB_INSTALL_ERROR_CODE.PACKAGE_NOT_FOUND,
      );
    }
    return buildLittleBabyHubInstallFailure(
      `Version not found on LittleBabyHub: ${context.name}@${context.version ?? "unknown"}.`,
      LITTLEBABYHUB_INSTALL_ERROR_CODE.VERSION_NOT_FOUND,
    );
  }
  return buildLittleBabyHubInstallFailure(formatErrorMessage(error));
}

function resolveRequestedVersion(params: {
  detail: LittleBabyHubPackageDetail;
  requestedVersion?: string;
}): string | null {
  if (params.requestedVersion) {
    return params.requestedVersion;
  }
  return resolveLatestVersionFromPackage(params.detail);
}

function readTrimmedString(value: unknown): string | null {
  return normalizeOptionalString(value) ?? null;
}

function normalizeLittleBabyHubRelativePath(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }
  if (value.trim() !== value || value.includes("\\")) {
    return null;
  }
  if (value.startsWith("/")) {
    return null;
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    return null;
  }
  return value;
}

function describeInvalidLittleBabyHubRelativePath(value: unknown): string {
  if (typeof value !== "string") {
    return `non-string value of type ${typeof value}`;
  }
  if (value.length === 0) {
    return "empty string";
  }
  if (value.trim() !== value) {
    return `path "${value}" has leading or trailing whitespace`;
  }
  if (value.includes("\\")) {
    return `path "${value}" contains backslashes`;
  }
  if (value.startsWith("/")) {
    return `path "${value}" is absolute`;
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment.length === 0)) {
    return `path "${value}" contains an empty segment`;
  }
  if (segments.some((segment) => segment === "." || segment === "..")) {
    return `path "${value}" contains dot segments`;
  }
  return `path "${value}" failed validation for an unknown reason`;
}

function describeInvalidLittleBabyHubSha256(value: unknown): string {
  if (typeof value !== "string") {
    return `non-string value of type ${typeof value}`;
  }
  if (value.length === 0) {
    return "empty string";
  }
  if (value.trim().length === 0) {
    return "whitespace-only string";
  }
  return `value "${value}" is not a 64-character hexadecimal SHA-256 digest`;
}

function resolveLittleBabyHubArchiveVerification(
  versionDetail: LittleBabyHubPackageVersion,
  packageName: string,
  version: string,
): LittleBabyHubArchiveVerificationResolution {
  const sha256hashValue = versionDetail.version?.sha256hash;
  const sha256hash = readTrimmedString(sha256hashValue);
  const integrity = sha256hash ? normalizeLittleBabyHubSha256Integrity(sha256hash) : null;
  if (integrity) {
    return {
      ok: true,
      verification: {
        kind: "archive-integrity",
        integrity,
      },
    };
  }
  if (sha256hashValue !== undefined && sha256hashValue !== null) {
    const detail =
      typeof sha256hashValue === "string" && sha256hashValue.trim().length === 0
        ? "empty string"
        : typeof sha256hashValue === "string"
          ? `unrecognized value "${sha256hashValue.trim()}"`
          : `non-string value of type ${typeof sha256hashValue}`;
    return buildLittleBabyHubInstallFailure(
      `LittleBabyHub version metadata for "${packageName}@${version}" has an invalid sha256hash (${detail}).`,
      LITTLEBABYHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
    );
  }
  const files = versionDetail.version?.files;
  if (!Array.isArray(files) || files.length === 0) {
    return {
      ok: true,
      verification: null,
    };
  }
  const normalizedFiles: LittleBabyHubFileVerificationEntry[] = [];
  const seenPaths = new Set<string>();
  for (const [index, file] of files.entries()) {
    if (!file || typeof file !== "object") {
      return buildLittleBabyHubInstallFailure(
        `LittleBabyHub version metadata for "${packageName}@${version}" has an invalid files[${index}] entry (expected an object, got ${file === null ? "null" : typeof file}).`,
        LITTLEBABYHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      );
    }
    const fileRecord = file as LittleBabyHubFileEntryLike;
    const filePath = normalizeLittleBabyHubRelativePath(fileRecord.path);
    const sha256Value = readTrimmedString(fileRecord.sha256);
    const sha256 = sha256Value ? normalizeLittleBabyHubSha256Hex(sha256Value) : null;
    if (!filePath) {
      return buildLittleBabyHubInstallFailure(
        `LittleBabyHub version metadata for "${packageName}@${version}" has an invalid files[${index}].path (${describeInvalidLittleBabyHubRelativePath(fileRecord.path)}).`,
        LITTLEBABYHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      );
    }
    if (filePath === LITTLEBABYHUB_GENERATED_ARCHIVE_METADATA_FILE) {
      return buildLittleBabyHubInstallFailure(
        `LittleBabyHub version metadata for "${packageName}@${version}" must not include generated file "${filePath}" in files[].`,
        LITTLEBABYHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      );
    }
    if (!sha256) {
      return buildLittleBabyHubInstallFailure(
        `LittleBabyHub version metadata for "${packageName}@${version}" has an invalid files[${index}].sha256 (${describeInvalidLittleBabyHubSha256(fileRecord.sha256)}).`,
        LITTLEBABYHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      );
    }
    if (seenPaths.has(filePath)) {
      return buildLittleBabyHubInstallFailure(
        `LittleBabyHub version metadata for "${packageName}@${version}" has duplicate files[] path "${filePath}".`,
        LITTLEBABYHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      );
    }
    seenPaths.add(filePath);
    normalizedFiles.push({ path: filePath, sha256 });
  }
  return {
    ok: true,
    verification: {
      kind: "file-list",
      files: normalizedFiles,
    },
  };
}

async function readLimitedLittleBabyHubArchiveEntry<T>(
  entry: JSZip.JSZipObject,
  limits: LittleBabyHubArchiveEntryLimits,
  handlers: {
    onChunk: (buffer: Buffer) => void;
    onEnd: () => T;
  },
): Promise<T | LittleBabyHubInstallFailure> {
  const hintedSize = (entry as JSZipObjectWithSize)._data?.uncompressedSize;
  if (
    typeof hintedSize === "number" &&
    Number.isFinite(hintedSize) &&
    hintedSize > limits.maxEntryBytes
  ) {
    return buildLittleBabyHubInstallFailure(
      `LittleBabyHub archive fallback verification rejected "${entry.name}" because it exceeds the per-file size limit.`,
      LITTLEBABYHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
    );
  }
  let entryBytes = 0;
  return await new Promise<T | LittleBabyHubInstallFailure>((resolve) => {
    let settled = false;
    const stream = entry.nodeStream("nodebuffer") as NodeJS.ReadableStream & {
      destroy?: (error?: Error) => void;
    };
    stream.on("data", (chunk: Buffer | Uint8Array | string) => {
      if (settled) {
        return;
      }
      const buffer =
        typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk as Uint8Array);
      entryBytes += buffer.byteLength;
      if (entryBytes > limits.maxEntryBytes) {
        settled = true;
        stream.destroy?.();
        resolve(
          buildLittleBabyHubInstallFailure(
            `LittleBabyHub archive fallback verification rejected "${entry.name}" because it exceeds the per-file size limit.`,
            LITTLEBABYHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
          ),
        );
        return;
      }
      if (!limits.addArchiveBytes(buffer.byteLength)) {
        settled = true;
        stream.destroy?.();
        resolve(
          buildLittleBabyHubInstallFailure(
            "LittleBabyHub archive fallback verification exceeded the total extracted-size limit.",
            LITTLEBABYHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
          ),
        );
        return;
      }
      handlers.onChunk(buffer);
    });
    stream.once("end", () => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(handlers.onEnd());
    });
    stream.once("error", (error: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(
        buildLittleBabyHubInstallFailure(
          error instanceof Error ? error.message : String(error),
          LITTLEBABYHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
        ),
      );
    });
  });
}

async function readLittleBabyHubArchiveEntryBuffer(
  entry: JSZip.JSZipObject,
  limits: LittleBabyHubArchiveEntryLimits,
): Promise<Buffer | LittleBabyHubInstallFailure> {
  const chunks: Buffer[] = [];
  return await readLimitedLittleBabyHubArchiveEntry(entry, limits, {
    onChunk(buffer) {
      chunks.push(buffer);
    },
    onEnd() {
      return Buffer.concat(chunks);
    },
  });
}

async function hashLittleBabyHubArchiveEntry(
  entry: JSZip.JSZipObject,
  limits: LittleBabyHubArchiveEntryLimits,
): Promise<string | LittleBabyHubInstallFailure> {
  const digest = createHash("sha256");
  return await readLimitedLittleBabyHubArchiveEntry(entry, limits, {
    onChunk(buffer) {
      digest.update(buffer);
    },
    onEnd() {
      return digest.digest("hex");
    },
  });
}

function validateLittleBabyHubArchiveMetaJson(params: {
  packageName: string;
  version: string;
  bytes: Buffer;
}): LittleBabyHubInstallFailure | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(params.bytes.toString("utf8"));
  } catch {
    return buildLittleBabyHubInstallFailure(
      `LittleBabyHub archive contents do not match files[] metadata for "${params.packageName}@${params.version}": _meta.json is not valid JSON.`,
      LITTLEBABYHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
    );
  }
  if (!parsed || typeof parsed !== "object") {
    return buildLittleBabyHubInstallFailure(
      `LittleBabyHub archive contents do not match files[] metadata for "${params.packageName}@${params.version}": _meta.json is not a JSON object.`,
      LITTLEBABYHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
    );
  }
  const record = parsed as { slug?: unknown; version?: unknown };
  if (record.slug !== params.packageName) {
    return buildLittleBabyHubInstallFailure(
      `LittleBabyHub archive contents do not match files[] metadata for "${params.packageName}@${params.version}": _meta.json slug does not match the package name.`,
      LITTLEBABYHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
    );
  }
  if (record.version !== params.version) {
    return buildLittleBabyHubInstallFailure(
      `LittleBabyHub archive contents do not match files[] metadata for "${params.packageName}@${params.version}": _meta.json version does not match the package version.`,
      LITTLEBABYHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
    );
  }
  return null;
}

async function verifyLittleBabyHubArchiveFiles(params: {
  archivePath: string;
  packageName: string;
  packageVersion: string;
  files: LittleBabyHubFileVerificationEntry[];
}): Promise<LittleBabyHubArchiveFileVerificationResult> {
  try {
    const archiveStat = await fs.stat(params.archivePath);
    if (archiveStat.size > DEFAULT_MAX_ARCHIVE_BYTES_ZIP) {
      return buildLittleBabyHubInstallFailure(
        "LittleBabyHub archive fallback verification rejected the downloaded archive because it exceeds the ZIP archive size limit.",
        LITTLEBABYHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      );
    }
    const archiveBytes = await fs.readFile(params.archivePath);
    const zip = await JSZip.loadAsync(archiveBytes);
    const actualFiles = new Map<string, string>();
    const validatedGeneratedPaths = new Set<string>();
    let entryCount = 0;
    let extractedBytes = 0;
    const addArchiveBytes = (bytes: number): boolean => {
      extractedBytes += bytes;
      return extractedBytes <= DEFAULT_MAX_EXTRACTED_BYTES;
    };
    for (const entry of Object.values(zip.files)) {
      entryCount += 1;
      if (entryCount > DEFAULT_MAX_ENTRIES) {
        return buildLittleBabyHubInstallFailure(
          "LittleBabyHub archive fallback verification exceeded the archive entry limit.",
          LITTLEBABYHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
        );
      }
      if (entry.dir) {
        continue;
      }
      const relativePath = normalizeLittleBabyHubRelativePath(entry.name);
      if (!relativePath) {
        return buildLittleBabyHubInstallFailure(
          `LittleBabyHub archive contents do not match files[] metadata for "${params.packageName}@${params.packageVersion}": invalid package file path "${entry.name}" (${describeInvalidLittleBabyHubRelativePath(entry.name)}).`,
          LITTLEBABYHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
        );
      }
      if (relativePath === LITTLEBABYHUB_GENERATED_ARCHIVE_METADATA_FILE) {
        const metaResult = await readLittleBabyHubArchiveEntryBuffer(entry, {
          maxEntryBytes: DEFAULT_MAX_ENTRY_BYTES,
          addArchiveBytes,
        });
        if (isLittleBabyHubInstallFailure(metaResult)) {
          return metaResult;
        }
        const metaFailure = validateLittleBabyHubArchiveMetaJson({
          packageName: params.packageName,
          version: params.packageVersion,
          bytes: metaResult,
        });
        if (metaFailure) {
          return metaFailure;
        }
        validatedGeneratedPaths.add(relativePath);
        continue;
      }
      const sha256 = await hashLittleBabyHubArchiveEntry(entry, {
        maxEntryBytes: DEFAULT_MAX_ENTRY_BYTES,
        addArchiveBytes,
      });
      if (typeof sha256 !== "string") {
        return sha256;
      }
      actualFiles.set(relativePath, sha256);
    }
    for (const file of params.files) {
      const actualSha256 = actualFiles.get(file.path);
      if (!actualSha256) {
        return buildLittleBabyHubInstallFailure(
          `LittleBabyHub archive contents do not match files[] metadata for "${params.packageName}@${params.packageVersion}": missing "${file.path}".`,
          LITTLEBABYHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
        );
      }
      if (actualSha256 !== file.sha256) {
        return buildLittleBabyHubInstallFailure(
          `LittleBabyHub archive contents do not match files[] metadata for "${params.packageName}@${params.packageVersion}": expected ${file.path} to hash to ${file.sha256}, got ${actualSha256}.`,
          LITTLEBABYHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
        );
      }
      actualFiles.delete(file.path);
    }
    const unexpectedFile = [...actualFiles.keys()].toSorted()[0];
    if (unexpectedFile) {
      return buildLittleBabyHubInstallFailure(
        `LittleBabyHub archive contents do not match files[] metadata for "${params.packageName}@${params.packageVersion}": unexpected file "${unexpectedFile}".`,
        LITTLEBABYHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      );
    }
    return {
      ok: true,
      validatedGeneratedPaths: [...validatedGeneratedPaths].toSorted(),
    };
  } catch {
    return buildLittleBabyHubInstallFailure(
      "LittleBabyHub archive fallback verification failed while reading the downloaded archive.",
      LITTLEBABYHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
    );
  }
}

async function resolveCompatiblePackageVersion(params: {
  detail: LittleBabyHubPackageDetail;
  requestedVersion?: string;
  baseUrl?: string;
  token?: string;
}): Promise<
  | {
      ok: true;
      version: string;
      compatibility?: LittleBabyHubPackageCompatibility | null;
      verification: LittleBabyHubArchiveVerification | null;
    }
  | LittleBabyHubInstallFailure
> {
  const requestedVersion = resolveRequestedVersion(params);
  if (!requestedVersion) {
    return buildLittleBabyHubInstallFailure(
      `LittleBabyHub package "${params.detail.package?.name ?? "unknown"}" has no installable version.`,
      LITTLEBABYHUB_INSTALL_ERROR_CODE.NO_INSTALLABLE_VERSION,
    );
  }
  let versionDetail;
  try {
    versionDetail = await fetchLittleBabyHubPackageVersion({
      name: params.detail.package?.name ?? "",
      version: requestedVersion,
      baseUrl: params.baseUrl,
      token: params.token,
    });
  } catch (error) {
    return mapLittleBabyHubRequestError(error, {
      stage: "version",
      name: params.detail.package?.name ?? "unknown",
      version: requestedVersion,
    });
  }
  const resolvedVersion = versionDetail.version?.version ?? requestedVersion;
  if (params.detail.package?.family === "skill") {
    return {
      ok: true,
      version: resolvedVersion,
      compatibility:
        versionDetail.version?.compatibility ?? params.detail.package?.compatibility ?? null,
      verification: null,
    };
  }
  const verificationState = resolveLittleBabyHubArchiveVerification(
    versionDetail,
    params.detail.package?.name ?? "unknown",
    resolvedVersion,
  );
  if (!verificationState.ok) {
    return verificationState;
  }
  return {
    ok: true,
    version: resolvedVersion,
    compatibility:
      versionDetail.version?.compatibility ?? params.detail.package?.compatibility ?? null,
    verification: verificationState.verification,
  };
}

function validateLittleBabyHubPluginPackage(params: {
  detail: LittleBabyHubPackageDetail;
  compatibility?: LittleBabyHubPackageCompatibility | null;
  runtimeVersion: string;
}): LittleBabyHubInstallFailure | null {
  const pkg = params.detail.package;
  if (!pkg) {
    return buildLittleBabyHubInstallFailure(
      "Package not found on LittleBabyHub.",
      LITTLEBABYHUB_INSTALL_ERROR_CODE.PACKAGE_NOT_FOUND,
    );
  }
  if (pkg.family === "skill") {
    return buildLittleBabyHubInstallFailure(
      `"${pkg.name}" is a skill. Use "littlebaby skills install ${pkg.name}" instead.`,
      LITTLEBABYHUB_INSTALL_ERROR_CODE.SKILL_PACKAGE,
    );
  }
  if (pkg.family !== "code-plugin" && pkg.family !== "bundle-plugin") {
    return buildLittleBabyHubInstallFailure(
      `Unsupported LittleBabyHub package family: ${String(pkg.family)}`,
      LITTLEBABYHUB_INSTALL_ERROR_CODE.UNSUPPORTED_FAMILY,
    );
  }
  if (pkg.channel === "private") {
    return buildLittleBabyHubInstallFailure(
      `"${pkg.name}" is private on LittleBabyHub and cannot be installed anonymously.`,
      LITTLEBABYHUB_INSTALL_ERROR_CODE.PRIVATE_PACKAGE,
    );
  }

  const compatibility = params.compatibility;
  const runtimeVersion = params.runtimeVersion;
  if (
    compatibility?.pluginApiRange &&
    !satisfiesPluginApiRange(runtimeVersion, compatibility.pluginApiRange)
  ) {
    return buildLittleBabyHubInstallFailure(
      `Plugin "${pkg.name}" requires plugin API ${compatibility.pluginApiRange}, but this LittleBaby runtime exposes ${runtimeVersion}.`,
      LITTLEBABYHUB_INSTALL_ERROR_CODE.INCOMPATIBLE_PLUGIN_API,
    );
  }

  if (
    compatibility?.minGatewayVersion &&
    !satisfiesGatewayMinimum(runtimeVersion, compatibility.minGatewayVersion)
  ) {
    return buildLittleBabyHubInstallFailure(
      `Plugin "${pkg.name}" requires LittleBaby >=${compatibility.minGatewayVersion}, but this host is ${runtimeVersion}.`,
      LITTLEBABYHUB_INSTALL_ERROR_CODE.INCOMPATIBLE_GATEWAY,
    );
  }
  return null;
}

function logLittleBabyHubPackageSummary(params: {
  detail: LittleBabyHubPackageDetail;
  version: string;
  compatibility?: LittleBabyHubPackageCompatibility | null;
  logger?: PluginInstallLogger;
}) {
  const pkg = params.detail.package;
  if (!pkg) {
    return;
  }
  const verification = pkg.verification?.tier ? ` verification=${pkg.verification.tier}` : "";
  params.logger?.info?.(
    `LittleBabyHub ${pkg.family} ${pkg.name}@${params.version} channel=${pkg.channel}${verification}`,
  );
  const compatibilityParts = [
    params.compatibility?.pluginApiRange
      ? `pluginApi=${params.compatibility.pluginApiRange}`
      : null,
    params.compatibility?.minGatewayVersion
      ? `minGateway=${params.compatibility.minGatewayVersion}`
      : null,
  ].filter(Boolean);
  if (compatibilityParts.length > 0) {
    params.logger?.info?.(`Compatibility: ${compatibilityParts.join(" ")}`);
  }
  if (pkg.channel !== "official") {
    params.logger?.warn?.(
      `LittleBabyHub package "${pkg.name}" is ${pkg.channel}; review source and verification before enabling.`,
    );
  }
}

export async function installPluginFromLittleBabyHub(
  params: InstallSafetyOverrides & {
    spec: string;
    baseUrl?: string;
    token?: string;
    logger?: PluginInstallLogger;
    mode?: "install" | "update";
    dryRun?: boolean;
    expectedPluginId?: string;
  },
): Promise<
  | ({
      ok: true;
    } & Extract<InstallPluginResult, { ok: true }> & {
        littlebabyhub: LittleBabyHubPluginInstallRecordFields;
        packageName: string;
      })
  | LittleBabyHubInstallFailure
  | Extract<InstallPluginResult, { ok: false }>
> {
  const parsed = parseLittleBabyHubPluginSpec(params.spec);
  if (!parsed?.name) {
    return buildLittleBabyHubInstallFailure(
      `invalid LittleBabyHub plugin spec: ${params.spec}`,
      LITTLEBABYHUB_INSTALL_ERROR_CODE.INVALID_SPEC,
    );
  }

  params.logger?.info?.(`Resolving ${formatLittleBabyHubSpecifier(parsed)}…`);
  let detail: LittleBabyHubPackageDetail;
  try {
    detail = await fetchLittleBabyHubPackageDetail({
      name: parsed.name,
      baseUrl: params.baseUrl,
      token: params.token,
    });
  } catch (error) {
    return mapLittleBabyHubRequestError(error, {
      stage: "package",
      name: parsed.name,
    });
  }
  const versionState = await resolveCompatiblePackageVersion({
    detail,
    requestedVersion: parsed.version,
    baseUrl: params.baseUrl,
    token: params.token,
  });
  if (!versionState.ok) {
    return versionState;
  }
  const runtimeVersion = resolveCompatibilityHostVersion();
  const validationFailure = validateLittleBabyHubPluginPackage({
    detail,
    compatibility: versionState.compatibility,
    runtimeVersion,
  });
  if (validationFailure) {
    return validationFailure;
  }
  if (!versionState.verification) {
    return buildLittleBabyHubInstallFailure(
      `LittleBabyHub version metadata for "${parsed.name}@${versionState.version}" is missing sha256hash and usable files[] metadata for fallback archive verification.`,
      LITTLEBABYHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
    );
  }
  const canonicalPackageName = detail.package?.name ?? parsed.name;
  logLittleBabyHubPackageSummary({
    detail,
    version: versionState.version,
    compatibility: versionState.compatibility,
    logger: params.logger,
  });

  let archive;
  try {
    archive = await downloadLittleBabyHubPackageArchive({
      name: parsed.name,
      version: versionState.version,
      baseUrl: params.baseUrl,
      token: params.token,
    });
  } catch (error) {
    return buildLittleBabyHubInstallFailure(formatErrorMessage(error));
  }
  try {
    if (versionState.verification.kind === "archive-integrity") {
      if (archive.integrity !== versionState.verification.integrity) {
        return buildLittleBabyHubInstallFailure(
          `LittleBabyHub archive integrity mismatch for "${parsed.name}@${versionState.version}": expected ${versionState.verification.integrity}, got ${archive.integrity}.`,
          LITTLEBABYHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
        );
      }
    } else {
      const validatedPaths = versionState.verification.files
        .map((file) => file.path)
        .toSorted()
        .join(", ");
      const fallbackVerification = await verifyLittleBabyHubArchiveFiles({
        archivePath: archive.archivePath,
        packageName: canonicalPackageName,
        packageVersion: versionState.version,
        files: versionState.verification.files,
      });
      if (!fallbackVerification.ok) {
        return fallbackVerification;
      }
      const validatedGeneratedPaths =
        fallbackVerification.validatedGeneratedPaths.length > 0
          ? ` Validated generated metadata files present in archive: ${fallbackVerification.validatedGeneratedPaths.join(", ")} (JSON parse plus slug/version match only).`
          : "";
      params.logger?.warn?.(
        `LittleBabyHub package "${canonicalPackageName}@${versionState.version}" is missing sha256hash; falling back to files[] verification. Validated files: ${validatedPaths}.${validatedGeneratedPaths}`,
      );
    }
    params.logger?.info?.(
      `Downloading ${detail.package?.family === "bundle-plugin" ? "bundle" : "plugin"} ${parsed.name}@${versionState.version} from LittleBabyHub…`,
    );
    const installResult = await installPluginFromArchive({
      archivePath: archive.archivePath,
      dangerouslyForceUnsafeInstall: params.dangerouslyForceUnsafeInstall,
      logger: params.logger,
      mode: params.mode,
      dryRun: params.dryRun,
      expectedPluginId: params.expectedPluginId,
    });
    if (!installResult.ok) {
      return installResult;
    }

    const pkg = detail.package!;
    const littlebabyhubFamily =
      pkg.family === "code-plugin" || pkg.family === "bundle-plugin" ? pkg.family : null;
    if (!littlebabyhubFamily) {
      return buildLittleBabyHubInstallFailure(
        `Unsupported LittleBabyHub package family: ${pkg.family}`,
        LITTLEBABYHUB_INSTALL_ERROR_CODE.UNSUPPORTED_FAMILY,
      );
    }
    return {
      ...installResult,
      packageName: parsed.name,
      littlebabyhub: {
        source: "littlebabyhub",
        littlebabyhubUrl:
          normalizeOptionalString(params.baseUrl) ||
          normalizeOptionalString(process.env.LITTLEBABY_LITTLEBABYHUB_URL) ||
          "https://littlebabyhub.ai",
        littlebabyhubPackage: parsed.name,
        littlebabyhubFamily,
        littlebabyhubChannel: pkg.channel,
        version: installResult.version ?? versionState.version,
        // For fallback installs this is the observed download digest, not a
        // server-attested sha256hash from LittleBabyHub version metadata.
        integrity: archive.integrity,
        resolvedAt: new Date().toISOString(),
      },
    };
  } finally {
    await archive.cleanup().catch(() => undefined);
  }
}
