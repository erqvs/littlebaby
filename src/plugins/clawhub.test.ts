import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import JSZip from "jszip";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const parseLittleBabyHubPluginSpecMock = vi.fn();
const fetchLittleBabyHubPackageDetailMock = vi.fn();
const fetchLittleBabyHubPackageVersionMock = vi.fn();
const downloadLittleBabyHubPackageArchiveMock = vi.fn();
const archiveCleanupMock = vi.fn();
const resolveLatestVersionFromPackageMock = vi.fn();
const resolveCompatibilityHostVersionMock = vi.fn();
const installPluginFromArchiveMock = vi.fn();

vi.mock("../infra/littlebabyhub.js", async () => {
  const actual = await vi.importActual<typeof import("../infra/littlebabyhub.js")>("../infra/littlebabyhub.js");
  return {
    ...actual,
    parseLittleBabyHubPluginSpec: (...args: unknown[]) => parseLittleBabyHubPluginSpecMock(...args),
    fetchLittleBabyHubPackageDetail: (...args: unknown[]) => fetchLittleBabyHubPackageDetailMock(...args),
    fetchLittleBabyHubPackageVersion: (...args: unknown[]) => fetchLittleBabyHubPackageVersionMock(...args),
    downloadLittleBabyHubPackageArchive: (...args: unknown[]) =>
      downloadLittleBabyHubPackageArchiveMock(...args),
    resolveLatestVersionFromPackage: (...args: unknown[]) =>
      resolveLatestVersionFromPackageMock(...args),
  };
});

vi.mock("../version.js", () => ({
  resolveCompatibilityHostVersion: (...args: unknown[]) =>
    resolveCompatibilityHostVersionMock(...args),
}));

vi.mock("./install.js", () => ({
  installPluginFromArchive: (...args: unknown[]) => installPluginFromArchiveMock(...args),
}));

vi.mock("../infra/archive.js", async () => {
  const actual = await vi.importActual<typeof import("../infra/archive.js")>("../infra/archive.js");
  return {
    ...actual,
    DEFAULT_MAX_ENTRIES: 50_000,
    DEFAULT_MAX_EXTRACTED_BYTES: 512 * 1024 * 1024,
    DEFAULT_MAX_ENTRY_BYTES: 256 * 1024 * 1024,
  };
});

const { LittleBabyHubRequestError } = await import("../infra/littlebabyhub.js");
const { LITTLEBABYHUB_INSTALL_ERROR_CODE, formatLittleBabyHubSpecifier, installPluginFromLittleBabyHub } =
  await import("./littlebabyhub.js");

const DEMO_ARCHIVE_INTEGRITY = "sha256-qerEjGEpvES2+Tyan0j2xwDRkbcnmh4ZFfKN9vWbsa8=";
const tempDirs: string[] = [];

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function createLittleBabyHubArchive(entries: Record<string, string>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "littlebaby-littlebabyhub-archive-"));
  tempDirs.push(dir);
  const archivePath = path.join(dir, "archive.zip");
  const zip = new JSZip();
  for (const [filePath, contents] of Object.entries(entries)) {
    zip.file(filePath, contents);
  }
  const archiveBytes = await zip.generateAsync({ type: "nodebuffer" });
  await fs.writeFile(archivePath, archiveBytes);
  return {
    archivePath,
    integrity: `sha256-${createHash("sha256").update(archiveBytes).digest("base64")}`,
  };
}

async function expectLittleBabyHubInstallError(params: {
  setup?: () => void;
  spec: string;
  expected: {
    ok: false;
    code: (typeof LITTLEBABYHUB_INSTALL_ERROR_CODE)[keyof typeof LITTLEBABYHUB_INSTALL_ERROR_CODE];
    error: string;
  };
}) {
  params.setup?.();
  await expect(installPluginFromLittleBabyHub({ spec: params.spec })).resolves.toMatchObject(
    params.expected,
  );
}

function createLoggerSpies() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
  };
}

function expectLittleBabyHubInstallFlow(params: {
  baseUrl: string;
  version: string;
  archivePath: string;
}) {
  expect(fetchLittleBabyHubPackageDetailMock).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "demo",
      baseUrl: params.baseUrl,
    }),
  );
  expect(fetchLittleBabyHubPackageVersionMock).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "demo",
      version: params.version,
    }),
  );
  expect(installPluginFromArchiveMock).toHaveBeenCalledWith(
    expect.objectContaining({
      archivePath: params.archivePath,
    }),
  );
}

function expectSuccessfulLittleBabyHubInstall(result: unknown) {
  expect(result).toMatchObject({
    ok: true,
    pluginId: "demo",
    version: "2026.3.22",
    littlebabyhub: {
      source: "littlebabyhub",
      littlebabyhubPackage: "demo",
      littlebabyhubFamily: "code-plugin",
      littlebabyhubChannel: "official",
      integrity: DEMO_ARCHIVE_INTEGRITY,
    },
  });
}

describe("installPluginFromLittleBabyHub", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
    );
  });

  beforeEach(() => {
    parseLittleBabyHubPluginSpecMock.mockReset();
    fetchLittleBabyHubPackageDetailMock.mockReset();
    fetchLittleBabyHubPackageVersionMock.mockReset();
    downloadLittleBabyHubPackageArchiveMock.mockReset();
    archiveCleanupMock.mockReset();
    resolveLatestVersionFromPackageMock.mockReset();
    resolveCompatibilityHostVersionMock.mockReset();
    installPluginFromArchiveMock.mockReset();

    parseLittleBabyHubPluginSpecMock.mockReturnValue({ name: "demo" });
    fetchLittleBabyHubPackageDetailMock.mockResolvedValue({
      package: {
        name: "demo",
        displayName: "Demo",
        family: "code-plugin",
        channel: "official",
        isOfficial: true,
        createdAt: 0,
        updatedAt: 0,
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    resolveLatestVersionFromPackageMock.mockReturnValue("2026.3.22");
    fetchLittleBabyHubPackageVersionMock.mockResolvedValue({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        sha256hash: "a9eac48c6129bc44b6f93c9a9f48f6c700d191b7279a1e1915f28df6f59bb1af",
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadLittleBabyHubPackageArchiveMock.mockResolvedValue({
      archivePath: "/tmp/littlebabyhub-demo/archive.zip",
      integrity: DEMO_ARCHIVE_INTEGRITY,
      cleanup: archiveCleanupMock,
    });
    archiveCleanupMock.mockResolvedValue(undefined);
    resolveCompatibilityHostVersionMock.mockReturnValue("2026.3.22");
    installPluginFromArchiveMock.mockResolvedValue({
      ok: true,
      pluginId: "demo",
      targetDir: "/tmp/littlebaby/plugins/demo",
      version: "2026.3.22",
    });
  });

  it("formats littlebabyhub specifiers", () => {
    expect(formatLittleBabyHubSpecifier({ name: "demo" })).toBe("littlebabyhub:demo");
    expect(formatLittleBabyHubSpecifier({ name: "demo", version: "1.2.3" })).toBe("littlebabyhub:demo@1.2.3");
  });

  it("installs a LittleBabyHub code plugin through the archive installer", async () => {
    const logger = createLoggerSpies();
    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
      baseUrl: "https://littlebabyhub.ai",
      logger,
    });

    expectLittleBabyHubInstallFlow({
      baseUrl: "https://littlebabyhub.ai",
      version: "2026.3.22",
      archivePath: "/tmp/littlebabyhub-demo/archive.zip",
    });
    expectSuccessfulLittleBabyHubInstall(result);
    expect(logger.info).toHaveBeenCalledWith("LittleBabyHub code-plugin demo@2026.3.22 channel=official");
    expect(logger.info).toHaveBeenCalledWith(
      "Compatibility: pluginApi=>=2026.3.22 minGateway=2026.3.0",
    );
    expect(logger.warn).not.toHaveBeenCalled();
    expect(archiveCleanupMock).toHaveBeenCalledTimes(1);
  });

  it("passes dangerous force unsafe install through to archive installs", async () => {
    await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
      dangerouslyForceUnsafeInstall: true,
    });

    expect(installPluginFromArchiveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        archivePath: "/tmp/littlebabyhub-demo/archive.zip",
        dangerouslyForceUnsafeInstall: true,
      }),
    );
  });

  it("cleans up the downloaded archive even when archive install fails", async () => {
    installPluginFromArchiveMock.mockResolvedValueOnce({
      ok: false,
      error: "bad archive",
    });

    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
      baseUrl: "https://littlebabyhub.ai",
    });

    expect(result).toMatchObject({
      ok: false,
      error: "bad archive",
    });
    expect(archiveCleanupMock).toHaveBeenCalledTimes(1);
  });

  it("accepts version-endpoint SHA-256 hashes expressed as raw hex", async () => {
    fetchLittleBabyHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        sha256hash: "a9eac48c6129bc44b6f93c9a9f48f6c700d191b7279a1e1915f28df6f59bb1af",
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadLittleBabyHubPackageArchiveMock.mockResolvedValueOnce({
      archivePath: "/tmp/littlebabyhub-demo/archive.zip",
      integrity: "sha256-qerEjGEpvES2+Tyan0j2xwDRkbcnmh4ZFfKN9vWbsa8=",
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
    });

    expect(result).toMatchObject({ ok: true, pluginId: "demo" });
  });

  it("accepts version-endpoint SHA-256 hashes expressed as unpadded SRI", async () => {
    fetchLittleBabyHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        sha256hash: "sha256-qerEjGEpvES2+Tyan0j2xwDRkbcnmh4ZFfKN9vWbsa8",
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadLittleBabyHubPackageArchiveMock.mockResolvedValueOnce({
      archivePath: "/tmp/littlebabyhub-demo/archive.zip",
      integrity: DEMO_ARCHIVE_INTEGRITY,
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
    });

    expect(result).toMatchObject({ ok: true, pluginId: "demo" });
  });

  it("falls back to strict files[] verification when sha256hash is missing", async () => {
    const archive = await createLittleBabyHubArchive({
      "littlebaby.plugin.json": '{"id":"demo"}',
      "dist/index.js": 'export const demo = "ok";',
      "_meta.json": '{"slug":"demo","version":"2026.3.22"}',
    });
    fetchLittleBabyHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        sha256hash: null,
        files: [
          {
            path: "dist/index.js",
            size: 25,
            sha256: sha256Hex('export const demo = "ok";'),
          },
          {
            path: "littlebaby.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadLittleBabyHubPackageArchiveMock.mockResolvedValueOnce({
      ...archive,
      cleanup: archiveCleanupMock,
    });
    const logger = createLoggerSpies();

    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
      logger,
    });

    expect(result).toMatchObject({ ok: true, pluginId: "demo" });
    expect(logger.warn).toHaveBeenCalledWith(
      'LittleBabyHub package "demo@2026.3.22" is missing sha256hash; falling back to files[] verification. Validated files: dist/index.js, littlebaby.plugin.json. Validated generated metadata files present in archive: _meta.json (JSON parse plus slug/version match only).',
    );
  });

  it("validates _meta.json against canonical package and resolved version metadata", async () => {
    const archive = await createLittleBabyHubArchive({
      "littlebaby.plugin.json": '{"id":"demo"}',
      "_meta.json": '{"slug":"demo","version":"2026.3.22"}',
    });
    parseLittleBabyHubPluginSpecMock.mockReturnValueOnce({ name: "DemoAlias", version: "latest" });
    fetchLittleBabyHubPackageDetailMock.mockResolvedValueOnce({
      package: {
        name: "demo",
        displayName: "Demo",
        family: "code-plugin",
        channel: "official",
        isOfficial: true,
        createdAt: 0,
        updatedAt: 0,
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    fetchLittleBabyHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        sha256hash: null,
        files: [
          {
            path: "littlebaby.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadLittleBabyHubPackageArchiveMock.mockResolvedValueOnce({
      ...archive,
      cleanup: archiveCleanupMock,
    });
    const logger = createLoggerSpies();

    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:DemoAlias@latest",
      logger,
    });

    expect(result).toMatchObject({ ok: true, pluginId: "demo", version: "2026.3.22" });
    expect(fetchLittleBabyHubPackageDetailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "DemoAlias",
      }),
    );
    expect(fetchLittleBabyHubPackageVersionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "demo",
        version: "latest",
      }),
    );
    expect(logger.warn).toHaveBeenCalledWith(
      'LittleBabyHub package "demo@2026.3.22" is missing sha256hash; falling back to files[] verification. Validated files: littlebaby.plugin.json. Validated generated metadata files present in archive: _meta.json (JSON parse plus slug/version match only).',
    );
  });

  it("fails closed when sha256hash is present but unrecognized instead of silently falling back", async () => {
    fetchLittleBabyHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        sha256hash: "definitely-not-a-sha256",
        files: [
          {
            path: "littlebaby.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });

    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
    });

    expect(result).toMatchObject({
      ok: false,
      code: LITTLEBABYHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      error:
        'LittleBabyHub version metadata for "demo@2026.3.22" has an invalid sha256hash (unrecognized value "definitely-not-a-sha256").',
    });
    expect(downloadLittleBabyHubPackageArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects LittleBabyHub installs when sha256hash is explicitly null and files[] is unavailable", async () => {
    fetchLittleBabyHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        sha256hash: null,
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });

    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
    });

    expect(result).toMatchObject({
      ok: false,
      code: LITTLEBABYHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      error:
        'LittleBabyHub version metadata for "demo@2026.3.22" is missing sha256hash and usable files[] metadata for fallback archive verification.',
    });
    expect(downloadLittleBabyHubPackageArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects LittleBabyHub installs when the version metadata has no archive hash or fallback files[]", async () => {
    fetchLittleBabyHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });

    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
    });

    expect(result).toMatchObject({
      ok: false,
      code: LITTLEBABYHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      error:
        'LittleBabyHub version metadata for "demo@2026.3.22" is missing sha256hash and usable files[] metadata for fallback archive verification.',
    });
    expect(downloadLittleBabyHubPackageArchiveMock).not.toHaveBeenCalled();
  });

  it("fails closed when files[] contains a malformed entry", async () => {
    fetchLittleBabyHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [null as unknown as { path: string; sha256: string }],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });

    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
    });

    expect(result).toMatchObject({
      ok: false,
      code: LITTLEBABYHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      error:
        'LittleBabyHub version metadata for "demo@2026.3.22" has an invalid files[0] entry (expected an object, got null).',
    });
    expect(downloadLittleBabyHubPackageArchiveMock).not.toHaveBeenCalled();
  });

  it("fails closed when files[] contains an invalid sha256", async () => {
    fetchLittleBabyHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "littlebaby.plugin.json",
            size: 13,
            sha256: "not-a-digest",
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });

    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
    });

    expect(result).toMatchObject({
      ok: false,
      code: LITTLEBABYHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      error:
        'LittleBabyHub version metadata for "demo@2026.3.22" has an invalid files[0].sha256 (value "not-a-digest" is not a 64-character hexadecimal SHA-256 digest).',
    });
    expect(downloadLittleBabyHubPackageArchiveMock).not.toHaveBeenCalled();
  });

  it("fails closed when sha256hash is not a string", async () => {
    fetchLittleBabyHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        sha256hash: 123 as unknown as string,
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });

    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
    });

    expect(result).toMatchObject({
      ok: false,
      code: LITTLEBABYHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      error:
        'LittleBabyHub version metadata for "demo@2026.3.22" has an invalid sha256hash (non-string value of type number).',
    });
    expect(downloadLittleBabyHubPackageArchiveMock).not.toHaveBeenCalled();
  });

  it("returns a typed install failure when the archive download throws", async () => {
    downloadLittleBabyHubPackageArchiveMock.mockRejectedValueOnce(new Error("network timeout"));

    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
    });

    expect(result).toMatchObject({
      ok: false,
      error: "network timeout",
    });
    expect(installPluginFromArchiveMock).not.toHaveBeenCalled();
  });

  it("returns a typed install failure when fallback archive verification cannot read the zip", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "littlebaby-littlebabyhub-archive-"));
    tempDirs.push(dir);
    const archivePath = path.join(dir, "archive.zip");
    await fs.writeFile(archivePath, "not-a-zip", "utf8");
    fetchLittleBabyHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "littlebaby.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadLittleBabyHubPackageArchiveMock.mockResolvedValueOnce({
      archivePath,
      integrity: "sha256-not-used-in-fallback",
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
    });

    expect(result).toMatchObject({
      ok: false,
      code: LITTLEBABYHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      error: "LittleBabyHub archive fallback verification failed while reading the downloaded archive.",
    });
    expect(installPluginFromArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects LittleBabyHub installs when the downloaded archive hash drifts from metadata", async () => {
    fetchLittleBabyHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        sha256hash: "1111111111111111111111111111111111111111111111111111111111111111",
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadLittleBabyHubPackageArchiveMock.mockResolvedValueOnce({
      archivePath: "/tmp/littlebabyhub-demo/archive.zip",
      integrity: DEMO_ARCHIVE_INTEGRITY,
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
    });

    expect(result).toMatchObject({
      ok: false,
      code: LITTLEBABYHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      error: `LittleBabyHub archive integrity mismatch for "demo@2026.3.22": expected sha256-ERERERERERERERERERERERERERERERERERERERERERE=, got ${DEMO_ARCHIVE_INTEGRITY}.`,
    });
    expect(installPluginFromArchiveMock).not.toHaveBeenCalled();
    expect(archiveCleanupMock).toHaveBeenCalledTimes(1);
  });

  it("rejects fallback verification when an expected file is missing from the archive", async () => {
    const archive = await createLittleBabyHubArchive({
      "littlebaby.plugin.json": '{"id":"demo"}',
    });
    fetchLittleBabyHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "littlebaby.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
          {
            path: "dist/index.js",
            size: 25,
            sha256: sha256Hex('export const demo = "ok";'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadLittleBabyHubPackageArchiveMock.mockResolvedValueOnce({
      ...archive,
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
    });

    expect(result).toMatchObject({
      ok: false,
      code: LITTLEBABYHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      error:
        'LittleBabyHub archive contents do not match files[] metadata for "demo@2026.3.22": missing "dist/index.js".',
    });
    expect(installPluginFromArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects fallback verification when the archive includes an unexpected file", async () => {
    const archive = await createLittleBabyHubArchive({
      "littlebaby.plugin.json": '{"id":"demo"}',
      "dist/index.js": 'export const demo = "ok";',
      "extra.txt": "surprise",
    });
    fetchLittleBabyHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "littlebaby.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
          {
            path: "dist/index.js",
            size: 25,
            sha256: sha256Hex('export const demo = "ok";'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadLittleBabyHubPackageArchiveMock.mockResolvedValueOnce({
      ...archive,
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
    });

    expect(result).toMatchObject({
      ok: false,
      code: LITTLEBABYHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      error:
        'LittleBabyHub archive contents do not match files[] metadata for "demo@2026.3.22": unexpected file "extra.txt".',
    });
    expect(installPluginFromArchiveMock).not.toHaveBeenCalled();
  });

  it("accepts root-level files[] paths and allows _meta.json as an unvalidated generated file", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "littlebaby-littlebabyhub-archive-"));
    tempDirs.push(dir);
    const archivePath = path.join(dir, "archive.zip");
    const zip = new JSZip();
    zip.file("scripts/search.py", "print('ok')\n");
    zip.file("SKILL.md", "# Demo\n");
    zip.file("_meta.json", '{"slug":"demo","version":"2026.3.22"}');
    const archiveBytes = await zip.generateAsync({ type: "nodebuffer" });
    await fs.writeFile(archivePath, archiveBytes);
    fetchLittleBabyHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "scripts/search.py",
            size: 12,
            sha256: sha256Hex("print('ok')\n"),
          },
          {
            path: "SKILL.md",
            size: 7,
            sha256: sha256Hex("# Demo\n"),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadLittleBabyHubPackageArchiveMock.mockResolvedValueOnce({
      archivePath,
      integrity: `sha256-${createHash("sha256").update(archiveBytes).digest("base64")}`,
      cleanup: archiveCleanupMock,
    });
    const logger = createLoggerSpies();

    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
      logger,
    });

    expect(result).toMatchObject({ ok: true, pluginId: "demo" });
    expect(logger.warn).toHaveBeenCalledWith(
      'LittleBabyHub package "demo@2026.3.22" is missing sha256hash; falling back to files[] verification. Validated files: SKILL.md, scripts/search.py. Validated generated metadata files present in archive: _meta.json (JSON parse plus slug/version match only).',
    );
  });

  it("omits the skipped-files suffix when no generated extras are present", async () => {
    const archive = await createLittleBabyHubArchive({
      "littlebaby.plugin.json": '{"id":"demo"}',
    });
    fetchLittleBabyHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "littlebaby.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadLittleBabyHubPackageArchiveMock.mockResolvedValueOnce({
      ...archive,
      cleanup: archiveCleanupMock,
    });
    const logger = createLoggerSpies();

    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
      logger,
    });

    expect(result).toMatchObject({ ok: true, pluginId: "demo" });
    expect(logger.warn).toHaveBeenCalledWith(
      'LittleBabyHub package "demo@2026.3.22" is missing sha256hash; falling back to files[] verification. Validated files: littlebaby.plugin.json.',
    );
  });

  it("rejects fallback verification when _meta.json is not valid JSON", async () => {
    const archive = await createLittleBabyHubArchive({
      "littlebaby.plugin.json": '{"id":"demo"}',
      "_meta.json": "{not-json",
    });
    fetchLittleBabyHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "littlebaby.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadLittleBabyHubPackageArchiveMock.mockResolvedValueOnce({
      ...archive,
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
    });

    expect(result).toMatchObject({
      ok: false,
      code: LITTLEBABYHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      error:
        'LittleBabyHub archive contents do not match files[] metadata for "demo@2026.3.22": _meta.json is not valid JSON.',
    });
    expect(installPluginFromArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects fallback verification when _meta.json slug does not match the package name", async () => {
    const archive = await createLittleBabyHubArchive({
      "littlebaby.plugin.json": '{"id":"demo"}',
      "_meta.json": '{"slug":"wrong","version":"2026.3.22"}',
    });
    fetchLittleBabyHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "littlebaby.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadLittleBabyHubPackageArchiveMock.mockResolvedValueOnce({
      ...archive,
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
    });

    expect(result).toMatchObject({
      ok: false,
      code: LITTLEBABYHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      error:
        'LittleBabyHub archive contents do not match files[] metadata for "demo@2026.3.22": _meta.json slug does not match the package name.',
    });
    expect(installPluginFromArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects fallback verification when _meta.json exceeds the per-file size limit", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "littlebaby-littlebabyhub-archive-"));
    tempDirs.push(dir);
    const archivePath = path.join(dir, "archive.zip");
    await fs.writeFile(archivePath, "placeholder", "utf8");
    const oversizedMetaEntry = {
      name: "_meta.json",
      dir: false,
      _data: { uncompressedSize: 256 * 1024 * 1024 + 1 },
      nodeStream: vi.fn(),
    } as unknown as JSZip.JSZipObject;
    const listedFileEntry = {
      name: "littlebaby.plugin.json",
      dir: false,
      _data: { uncompressedSize: 13 },
      nodeStream: () => Readable.from([Buffer.from('{"id":"demo"}')]),
    } as unknown as JSZip.JSZipObject;
    const loadAsyncSpy = vi.spyOn(JSZip, "loadAsync").mockResolvedValueOnce({
      files: {
        "_meta.json": oversizedMetaEntry,
        "littlebaby.plugin.json": listedFileEntry,
      },
    } as unknown as JSZip);
    fetchLittleBabyHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "littlebaby.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadLittleBabyHubPackageArchiveMock.mockResolvedValueOnce({
      archivePath,
      integrity: "sha256-not-used-in-fallback",
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
    });

    loadAsyncSpy.mockRestore();
    expect(result).toMatchObject({
      ok: false,
      code: LITTLEBABYHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      error:
        'LittleBabyHub archive fallback verification rejected "_meta.json" because it exceeds the per-file size limit.',
    });
    expect(installPluginFromArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects fallback verification when archive directories alone exceed the entry limit", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "littlebaby-littlebabyhub-archive-"));
    tempDirs.push(dir);
    const archivePath = path.join(dir, "archive.zip");
    await fs.writeFile(archivePath, "placeholder", "utf8");
    const zipEntries = Object.fromEntries(
      Array.from({ length: 50_001 }, (_, index) => [
        `folder-${index}/`,
        {
          name: `folder-${index}/`,
          dir: true,
        },
      ]),
    );
    const loadAsyncSpy = vi.spyOn(JSZip, "loadAsync").mockResolvedValueOnce({
      files: zipEntries,
    } as unknown as JSZip);
    fetchLittleBabyHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "littlebaby.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadLittleBabyHubPackageArchiveMock.mockResolvedValueOnce({
      archivePath,
      integrity: "sha256-not-used-in-fallback",
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
    });

    loadAsyncSpy.mockRestore();
    expect(result).toMatchObject({
      ok: false,
      code: LITTLEBABYHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      error: "LittleBabyHub archive fallback verification exceeded the archive entry limit.",
    });
    expect(installPluginFromArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects fallback verification when the downloaded archive exceeds the ZIP size limit", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "littlebaby-littlebabyhub-archive-"));
    tempDirs.push(dir);
    const archivePath = path.join(dir, "archive.zip");
    await fs.writeFile(archivePath, "placeholder", "utf8");
    const realStat = fs.stat.bind(fs);
    const statSpy = vi.spyOn(fs, "stat").mockImplementation(async (filePath, options) => {
      if (filePath === archivePath) {
        return {
          size: 256 * 1024 * 1024 + 1,
        } as Awaited<ReturnType<typeof fs.stat>>;
      }
      return await realStat(filePath, options);
    });
    fetchLittleBabyHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "littlebaby.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadLittleBabyHubPackageArchiveMock.mockResolvedValueOnce({
      archivePath,
      integrity: "sha256-not-used-in-fallback",
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
    });

    statSpy.mockRestore();
    expect(result).toMatchObject({
      ok: false,
      code: LITTLEBABYHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      error:
        "LittleBabyHub archive fallback verification rejected the downloaded archive because it exceeds the ZIP archive size limit.",
    });
    expect(installPluginFromArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects fallback verification when a file hash drifts from files[] metadata", async () => {
    const archive = await createLittleBabyHubArchive({
      "littlebaby.plugin.json": '{"id":"demo"}',
    });
    fetchLittleBabyHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "littlebaby.plugin.json",
            size: 13,
            sha256: "1".repeat(64),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadLittleBabyHubPackageArchiveMock.mockResolvedValueOnce({
      ...archive,
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
    });

    expect(result).toMatchObject({
      ok: false,
      code: LITTLEBABYHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      error: `LittleBabyHub archive contents do not match files[] metadata for "demo@2026.3.22": expected littlebaby.plugin.json to hash to ${"1".repeat(64)}, got ${sha256Hex('{"id":"demo"}')}.`,
    });
    expect(installPluginFromArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects fallback metadata with an unsafe files[] path", async () => {
    fetchLittleBabyHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "../evil.txt",
            size: 4,
            sha256: "1".repeat(64),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });

    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
    });

    expect(result).toMatchObject({
      ok: false,
      code: LITTLEBABYHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      error:
        'LittleBabyHub version metadata for "demo@2026.3.22" has an invalid files[0].path (path "../evil.txt" contains dot segments).',
    });
    expect(downloadLittleBabyHubPackageArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects fallback metadata with leading or trailing path whitespace", async () => {
    fetchLittleBabyHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "littlebaby.plugin.json ",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });

    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
    });

    expect(result).toMatchObject({
      ok: false,
      code: LITTLEBABYHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      error:
        'LittleBabyHub version metadata for "demo@2026.3.22" has an invalid files[0].path (path "littlebaby.plugin.json " has leading or trailing whitespace).',
    });
    expect(downloadLittleBabyHubPackageArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects fallback verification when the archive includes a whitespace-suffixed file path", async () => {
    const archive = await createLittleBabyHubArchive({
      "littlebaby.plugin.json": '{"id":"demo"}',
      "littlebaby.plugin.json ": '{"id":"demo"}',
    });
    fetchLittleBabyHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "littlebaby.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });
    downloadLittleBabyHubPackageArchiveMock.mockResolvedValueOnce({
      ...archive,
      cleanup: archiveCleanupMock,
    });

    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
    });

    expect(result).toMatchObject({
      ok: false,
      code: LITTLEBABYHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      error:
        'LittleBabyHub archive contents do not match files[] metadata for "demo@2026.3.22": invalid package file path "littlebaby.plugin.json " (path "littlebaby.plugin.json " has leading or trailing whitespace).',
    });
    expect(installPluginFromArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects fallback metadata with duplicate files[] paths", async () => {
    fetchLittleBabyHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "littlebaby.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
          {
            path: "littlebaby.plugin.json",
            size: 13,
            sha256: sha256Hex('{"id":"demo"}'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });

    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
    });

    expect(result).toMatchObject({
      ok: false,
      code: LITTLEBABYHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      error:
        'LittleBabyHub version metadata for "demo@2026.3.22" has duplicate files[] path "littlebaby.plugin.json".',
    });
    expect(downloadLittleBabyHubPackageArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects fallback metadata when files[] includes generated _meta.json", async () => {
    fetchLittleBabyHubPackageVersionMock.mockResolvedValueOnce({
      version: {
        version: "2026.3.22",
        createdAt: 0,
        changelog: "",
        files: [
          {
            path: "_meta.json",
            size: 64,
            sha256: sha256Hex('{"slug":"demo","version":"2026.3.22"}'),
          },
        ],
        compatibility: {
          pluginApiRange: ">=2026.3.22",
          minGatewayVersion: "2026.3.0",
        },
      },
    });

    const result = await installPluginFromLittleBabyHub({
      spec: "littlebabyhub:demo",
    });

    expect(result).toMatchObject({
      ok: false,
      code: LITTLEBABYHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      error:
        'LittleBabyHub version metadata for "demo@2026.3.22" must not include generated file "_meta.json" in files[].',
    });
    expect(downloadLittleBabyHubPackageArchiveMock).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "rejects packages whose plugin API range exceeds the runtime version",
      setup: () => {
        resolveCompatibilityHostVersionMock.mockReturnValueOnce("2026.3.21");
      },
      spec: "littlebabyhub:demo",
      expected: {
        ok: false,
        code: LITTLEBABYHUB_INSTALL_ERROR_CODE.INCOMPATIBLE_PLUGIN_API,
        error:
          'Plugin "demo" requires plugin API >=2026.3.22, but this LittleBaby runtime exposes 2026.3.21.',
      },
    },
    {
      name: "rejects skill families and redirects to skills install",
      setup: () => {
        fetchLittleBabyHubPackageDetailMock.mockResolvedValueOnce({
          package: {
            name: "calendar",
            displayName: "Calendar",
            family: "skill",
            channel: "official",
            isOfficial: true,
            createdAt: 0,
            updatedAt: 0,
          },
        });
      },
      spec: "littlebabyhub:calendar",
      expected: {
        ok: false,
        code: LITTLEBABYHUB_INSTALL_ERROR_CODE.SKILL_PACKAGE,
        error: '"calendar" is a skill. Use "littlebaby skills install calendar" instead.',
      },
    },
    {
      name: "redirects skill families before missing archive metadata checks",
      setup: () => {
        fetchLittleBabyHubPackageDetailMock.mockResolvedValueOnce({
          package: {
            name: "calendar",
            displayName: "Calendar",
            family: "skill",
            channel: "official",
            isOfficial: true,
            createdAt: 0,
            updatedAt: 0,
          },
        });
        fetchLittleBabyHubPackageVersionMock.mockResolvedValueOnce({
          version: {
            version: "2026.3.22",
            createdAt: 0,
            changelog: "",
          },
        });
      },
      spec: "littlebabyhub:calendar",
      expected: {
        ok: false,
        code: LITTLEBABYHUB_INSTALL_ERROR_CODE.SKILL_PACKAGE,
        error: '"calendar" is a skill. Use "littlebaby skills install calendar" instead.',
      },
    },
    {
      name: "returns typed package-not-found failures",
      setup: () => {
        fetchLittleBabyHubPackageDetailMock.mockRejectedValueOnce(
          new LittleBabyHubRequestError({
            path: "/api/v1/packages/demo",
            status: 404,
            body: "Package not found",
          }),
        );
      },
      spec: "littlebabyhub:demo",
      expected: {
        ok: false,
        code: LITTLEBABYHUB_INSTALL_ERROR_CODE.PACKAGE_NOT_FOUND,
        error: "Package not found on LittleBabyHub.",
      },
    },
    {
      name: "returns typed version-not-found failures",
      setup: () => {
        parseLittleBabyHubPluginSpecMock.mockReturnValueOnce({ name: "demo", version: "9.9.9" });
        fetchLittleBabyHubPackageVersionMock.mockRejectedValueOnce(
          new LittleBabyHubRequestError({
            path: "/api/v1/packages/demo/versions/9.9.9",
            status: 404,
            body: "Version not found",
          }),
        );
      },
      spec: "littlebabyhub:demo@9.9.9",
      expected: {
        ok: false,
        code: LITTLEBABYHUB_INSTALL_ERROR_CODE.VERSION_NOT_FOUND,
        error: "Version not found on LittleBabyHub: demo@9.9.9.",
      },
    },
  ] as const)("$name", async ({ setup, spec, expected }) => {
    await expectLittleBabyHubInstallError({ setup, spec, expected });
  });
});
