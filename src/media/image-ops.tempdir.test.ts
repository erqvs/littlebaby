import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolvePreferredLittleBabyTmpDir } from "../infra/tmp-littlebaby-dir.js";
import { getImageMetadata } from "./image-ops.js";

describe("image-ops temp dir", () => {
  let createdTempDir = "";

  beforeEach(() => {
    process.env.LITTLEBABY_IMAGE_BACKEND = "sips";
    const originalMkdtemp = fs.mkdtemp.bind(fs);
    vi.spyOn(fs, "mkdtemp").mockImplementation(async (prefix) => {
      createdTempDir = await originalMkdtemp(prefix);
      return createdTempDir;
    });
  });

  afterEach(() => {
    delete process.env.LITTLEBABY_IMAGE_BACKEND;
    vi.restoreAllMocks();
  });

  it("creates sips temp dirs under the secured LittleBaby tmp root", async () => {
    const secureRoot = resolvePreferredLittleBabyTmpDir();

    await getImageMetadata(Buffer.from("image"));

    expect(fs.mkdtemp).toHaveBeenCalledTimes(1);
    expect(fs.mkdtemp).toHaveBeenCalledWith(path.join(secureRoot, "littlebaby-img-"));
    expect(createdTempDir.startsWith(path.join(secureRoot, "littlebaby-img-"))).toBe(true);
    await expect(fs.access(createdTempDir)).rejects.toMatchObject({ code: "ENOENT" });
  });
});
