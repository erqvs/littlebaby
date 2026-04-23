import { beforeEach, describe, expect, it, vi } from "vitest";

const searchSkillsFromLittleBabyHubMock = vi.fn();
const fetchLittleBabyHubSkillDetailMock = vi.fn();

vi.mock("../../config/config.js", () => ({
  loadConfig: vi.fn(() => ({})),
  writeConfigFile: vi.fn(),
}));

vi.mock("../../agents/agent-scope.js", () => ({
  listAgentIds: vi.fn(() => ["main"]),
  resolveDefaultAgentId: vi.fn(() => "main"),
  resolveAgentWorkspaceDir: vi.fn(() => "/tmp/workspace"),
}));

vi.mock("../../agents/skills-littlebabyhub.js", () => ({
  installSkillFromLittleBabyHub: vi.fn(),
  updateSkillsFromLittleBabyHub: vi.fn(),
  searchSkillsFromLittleBabyHub: (...args: unknown[]) => searchSkillsFromLittleBabyHubMock(...args),
}));

vi.mock("../../infra/littlebabyhub.js", () => ({
  fetchLittleBabyHubSkillDetail: (...args: unknown[]) => fetchLittleBabyHubSkillDetailMock(...args),
  resolveLittleBabyHubBaseUrl: vi.fn(() => "https://littlebabyhub.ai"),
  searchLittleBabyHubSkills: vi.fn(),
  downloadLittleBabyHubSkillArchive: vi.fn(),
}));

vi.mock("../../agents/skills-install.js", () => ({
  installSkill: vi.fn(),
}));

const { skillsHandlers } = await import("./skills.js");

function callHandler(method: string, params: Record<string, unknown>) {
  let ok: boolean | null = null;
  let response: unknown;
  let error: unknown;
  const result = skillsHandlers[method]({
    params,
    req: {} as never,
    client: null as never,
    isWebchatConnect: () => false,
    context: {} as never,
    respond: (success: boolean, res: unknown, err: unknown) => {
      ok = success;
      response = res;
      error = err;
    },
  });
  return Promise.resolve(result).then(() => ({ ok, response, error }));
}

describe("skills.search handler", () => {
  beforeEach(() => {
    searchSkillsFromLittleBabyHubMock.mockReset();
    fetchLittleBabyHubSkillDetailMock.mockReset();
  });

  it("searches LittleBabyHub with query and limit", async () => {
    searchSkillsFromLittleBabyHubMock.mockResolvedValue([
      {
        score: 0.95,
        slug: "github",
        displayName: "GitHub",
        summary: "GitHub integration",
        version: "1.0.0",
        updatedAt: 1700000000,
      },
    ]);

    const { ok, response, error } = await callHandler("skills.search", {
      query: "github",
      limit: 10,
    });

    expect(searchSkillsFromLittleBabyHubMock).toHaveBeenCalledWith({
      query: "github",
      limit: 10,
    });
    expect(ok).toBe(true);
    expect(error).toBeUndefined();
    expect(response).toEqual({
      results: [
        {
          score: 0.95,
          slug: "github",
          displayName: "GitHub",
          summary: "GitHub integration",
          version: "1.0.0",
          updatedAt: 1700000000,
        },
      ],
    });
  });

  it("searches without query (browse all)", async () => {
    searchSkillsFromLittleBabyHubMock.mockResolvedValue([]);

    const { ok, response } = await callHandler("skills.search", {});

    expect(searchSkillsFromLittleBabyHubMock).toHaveBeenCalledWith({
      query: undefined,
      limit: undefined,
    });
    expect(ok).toBe(true);
    expect(response).toEqual({ results: [] });
  });

  it("returns error when LittleBabyHub is unreachable", async () => {
    searchSkillsFromLittleBabyHubMock.mockRejectedValue(new Error("connection refused"));

    const { ok, error } = await callHandler("skills.search", { query: "test" });

    expect(ok).toBe(false);
    expect(error).toMatchObject({ message: "connection refused" });
  });

  it("rejects limit below minimum", async () => {
    const { ok, error } = await callHandler("skills.search", {
      query: "test",
      limit: 0,
    });

    expect(ok).toBe(false);
    expect(error).toMatchObject({ code: "INVALID_REQUEST" });
    expect(searchSkillsFromLittleBabyHubMock).not.toHaveBeenCalled();
  });

  it("rejects limit above maximum", async () => {
    const { ok, error } = await callHandler("skills.search", {
      query: "test",
      limit: 101,
    });

    expect(ok).toBe(false);
    expect(error).toMatchObject({ code: "INVALID_REQUEST" });
    expect(searchSkillsFromLittleBabyHubMock).not.toHaveBeenCalled();
  });
});

describe("skills.detail handler", () => {
  beforeEach(() => {
    searchSkillsFromLittleBabyHubMock.mockReset();
    fetchLittleBabyHubSkillDetailMock.mockReset();
  });

  it("fetches detail for a valid slug", async () => {
    const detail = {
      skill: {
        slug: "github",
        displayName: "GitHub",
        summary: "GitHub integration",
        createdAt: 1700000000,
        updatedAt: 1700000000,
      },
      latestVersion: {
        version: "1.0.0",
        createdAt: 1700000000,
      },
      owner: {
        handle: "littlebaby",
        displayName: "LittleBaby",
      },
    };
    fetchLittleBabyHubSkillDetailMock.mockResolvedValue(detail);

    const { ok, response, error } = await callHandler("skills.detail", {
      slug: "github",
    });

    expect(fetchLittleBabyHubSkillDetailMock).toHaveBeenCalledWith({ slug: "github" });
    expect(ok).toBe(true);
    expect(error).toBeUndefined();
    expect(response).toEqual(detail);
  });

  it("returns error when slug is not found", async () => {
    fetchLittleBabyHubSkillDetailMock.mockRejectedValue(new Error("not found"));

    const { ok, error } = await callHandler("skills.detail", { slug: "nonexistent" });

    expect(ok).toBe(false);
    expect(error).toMatchObject({ message: "not found" });
  });

  it("rejects missing slug", async () => {
    const { ok, error } = await callHandler("skills.detail", {});

    expect(ok).toBe(false);
    expect(error).toMatchObject({ code: "INVALID_REQUEST" });
    expect(fetchLittleBabyHubSkillDetailMock).not.toHaveBeenCalled();
  });

  it("rejects empty slug", async () => {
    const { ok, error } = await callHandler("skills.detail", { slug: "" });

    expect(ok).toBe(false);
    expect(error).toMatchObject({ code: "INVALID_REQUEST" });
    expect(fetchLittleBabyHubSkillDetailMock).not.toHaveBeenCalled();
  });
});
