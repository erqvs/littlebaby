import { afterEach, describe, expect, it, vi } from "vitest";
import { importFreshModule } from "../../test/helpers/import-fresh.js";

type LoggerModule = typeof import("./logger.js");

const originalGetBuiltinModule = (
  process as NodeJS.Process & { getBuiltinModule?: (id: string) => unknown }
).getBuiltinModule;

async function importBrowserSafeLogger(params?: {
  resolvePreferredLittleBabyTmpDir?: ReturnType<typeof vi.fn>;
}): Promise<{
  module: LoggerModule;
  resolvePreferredLittleBabyTmpDir: ReturnType<typeof vi.fn>;
}> {
  const resolvePreferredLittleBabyTmpDir =
    params?.resolvePreferredLittleBabyTmpDir ??
    vi.fn(() => {
      throw new Error("resolvePreferredLittleBabyTmpDir should not run during browser-safe import");
    });

  vi.doMock("../infra/tmp-littlebaby-dir.js", async () => {
    const actual = await vi.importActual<typeof import("../infra/tmp-littlebaby-dir.js")>(
      "../infra/tmp-littlebaby-dir.js",
    );
    return {
      ...actual,
      resolvePreferredLittleBabyTmpDir,
    };
  });

  Object.defineProperty(process, "getBuiltinModule", {
    configurable: true,
    value: undefined,
  });

  const module = await importFreshModule<LoggerModule>(
    import.meta.url,
    "./logger.js?scope=browser-safe",
  );
  return { module, resolvePreferredLittleBabyTmpDir };
}

describe("logging/logger browser-safe import", () => {
  afterEach(() => {
    vi.doUnmock("../infra/tmp-littlebaby-dir.js");
    Object.defineProperty(process, "getBuiltinModule", {
      configurable: true,
      value: originalGetBuiltinModule,
    });
  });

  it("does not resolve the preferred temp dir at import time when node fs is unavailable", async () => {
    const { module, resolvePreferredLittleBabyTmpDir } = await importBrowserSafeLogger();

    expect(resolvePreferredLittleBabyTmpDir).not.toHaveBeenCalled();
    expect(module.DEFAULT_LOG_DIR).toBe("/tmp/littlebaby");
    expect(module.DEFAULT_LOG_FILE).toBe("/tmp/littlebaby/littlebaby.log");
  });

  it("disables file logging when imported in a browser-like environment", async () => {
    const { module, resolvePreferredLittleBabyTmpDir } = await importBrowserSafeLogger();

    expect(module.getResolvedLoggerSettings()).toMatchObject({
      level: "silent",
      file: "/tmp/littlebaby/littlebaby.log",
    });
    expect(module.isFileLogLevelEnabled("info")).toBe(false);
    expect(() => module.getLogger().info("browser-safe")).not.toThrow();
    expect(resolvePreferredLittleBabyTmpDir).not.toHaveBeenCalled();
  });
});
