import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerSkillsCli } from "./skills-cli.js";

const mocks = vi.hoisted(() => {
  const runtimeLogs: string[] = [];
  const runtimeStdout: string[] = [];
  const runtimeErrors: string[] = [];
  const stringifyArgs = (args: unknown[]) => args.map((value) => String(value)).join(" ");
  const skillStatusReportFixture = {
    workspaceDir: "/tmp/workspace",
    managedSkillsDir: "/tmp/workspace/skills",
    skills: [
      {
        name: "calendar",
        description: "Calendar helpers",
        source: "bundled",
        bundled: false,
        filePath: "/tmp/workspace/skills/calendar/SKILL.md",
        baseDir: "/tmp/workspace/skills/calendar",
        skillKey: "calendar",
        emoji: "📅",
        homepage: "https://example.com/calendar",
        always: false,
        disabled: false,
        blockedByAllowlist: false,
        eligible: true,
        primaryEnv: "CALENDAR_API_KEY",
        requirements: {
          bins: [],
          anyBins: [],
          env: ["CALENDAR_API_KEY"],
          config: [],
          os: [],
        },
        missing: {
          bins: [],
          anyBins: [],
          env: [],
          config: [],
          os: [],
        },
        configChecks: [],
        install: [],
      },
    ],
  };
  const defaultRuntime = {
    log: vi.fn((...args: unknown[]) => {
      runtimeLogs.push(stringifyArgs(args));
    }),
    error: vi.fn((...args: unknown[]) => {
      runtimeErrors.push(stringifyArgs(args));
    }),
    writeStdout: vi.fn((value: string) => {
      runtimeStdout.push(value.endsWith("\n") ? value.slice(0, -1) : value);
    }),
    writeJson: vi.fn((value: unknown, space = 2) => {
      runtimeStdout.push(JSON.stringify(value, null, space > 0 ? space : undefined));
    }),
    exit: vi.fn((code: number) => {
      throw new Error(`__exit__:${code}`);
    }),
  };
  const buildWorkspaceSkillStatusMock = vi.fn((workspaceDir: string, options?: unknown) => {
    void workspaceDir;
    void options;
    return skillStatusReportFixture;
  });
  return {
    loadConfigMock: vi.fn(() => ({})),
    resolveDefaultAgentIdMock: vi.fn(() => "main"),
    resolveAgentWorkspaceDirMock: vi.fn(() => "/tmp/workspace"),
    searchSkillsFromLittleBabyHubMock: vi.fn(),
    installSkillFromLittleBabyHubMock: vi.fn(),
    updateSkillsFromLittleBabyHubMock: vi.fn(),
    readTrackedLittleBabyHubSkillSlugsMock: vi.fn(),
    buildWorkspaceSkillStatusMock,
    skillStatusReportFixture,
    defaultRuntime,
    runtimeLogs,
    runtimeStdout,
    runtimeErrors,
  };
});

const {
  loadConfigMock,
  resolveDefaultAgentIdMock,
  resolveAgentWorkspaceDirMock,
  searchSkillsFromLittleBabyHubMock,
  installSkillFromLittleBabyHubMock,
  updateSkillsFromLittleBabyHubMock,
  readTrackedLittleBabyHubSkillSlugsMock,
  buildWorkspaceSkillStatusMock,
  skillStatusReportFixture,
  defaultRuntime,
  runtimeLogs,
  runtimeStdout,
  runtimeErrors,
} = mocks;

vi.mock("../runtime.js", () => ({
  defaultRuntime: mocks.defaultRuntime,
}));

vi.mock("../config/config.js", () => ({
  loadConfig: () => mocks.loadConfigMock(),
}));

vi.mock("../agents/agent-scope.js", () => ({
  resolveDefaultAgentId: () => mocks.resolveDefaultAgentIdMock(),
  resolveAgentWorkspaceDir: () => mocks.resolveAgentWorkspaceDirMock(),
}));

vi.mock("../agents/skills-littlebabyhub.js", () => ({
  searchSkillsFromLittleBabyHub: (...args: unknown[]) => mocks.searchSkillsFromLittleBabyHubMock(...args),
  installSkillFromLittleBabyHub: (...args: unknown[]) => mocks.installSkillFromLittleBabyHubMock(...args),
  updateSkillsFromLittleBabyHub: (...args: unknown[]) => mocks.updateSkillsFromLittleBabyHubMock(...args),
  readTrackedLittleBabyHubSkillSlugs: (...args: unknown[]) =>
    mocks.readTrackedLittleBabyHubSkillSlugsMock(...args),
}));

vi.mock("../agents/skills-status.js", () => ({
  buildWorkspaceSkillStatus: (workspaceDir: string, options?: unknown) =>
    mocks.buildWorkspaceSkillStatusMock(workspaceDir, options),
}));

describe("skills cli commands", () => {
  const createProgram = () => {
    const program = new Command();
    program.exitOverride();
    registerSkillsCli(program);
    return program;
  };

  const runCommand = (argv: string[]) => createProgram().parseAsync(argv, { from: "user" });

  beforeEach(() => {
    runtimeLogs.length = 0;
    runtimeStdout.length = 0;
    runtimeErrors.length = 0;
    loadConfigMock.mockReset();
    resolveDefaultAgentIdMock.mockReset();
    resolveAgentWorkspaceDirMock.mockReset();
    searchSkillsFromLittleBabyHubMock.mockReset();
    installSkillFromLittleBabyHubMock.mockReset();
    updateSkillsFromLittleBabyHubMock.mockReset();
    readTrackedLittleBabyHubSkillSlugsMock.mockReset();
    buildWorkspaceSkillStatusMock.mockReset();

    loadConfigMock.mockReturnValue({});
    resolveDefaultAgentIdMock.mockReturnValue("main");
    resolveAgentWorkspaceDirMock.mockReturnValue("/tmp/workspace");
    searchSkillsFromLittleBabyHubMock.mockResolvedValue([]);
    installSkillFromLittleBabyHubMock.mockResolvedValue({
      ok: false,
      error: "install disabled in test",
    });
    updateSkillsFromLittleBabyHubMock.mockResolvedValue([]);
    readTrackedLittleBabyHubSkillSlugsMock.mockResolvedValue([]);
    buildWorkspaceSkillStatusMock.mockReturnValue(skillStatusReportFixture);
    defaultRuntime.log.mockClear();
    defaultRuntime.error.mockClear();
    defaultRuntime.writeStdout.mockClear();
    defaultRuntime.writeJson.mockClear();
    defaultRuntime.exit.mockClear();
  });

  it("searches LittleBabyHub skills from the native CLI", async () => {
    searchSkillsFromLittleBabyHubMock.mockResolvedValue([
      {
        slug: "calendar",
        displayName: "Calendar",
        summary: "CalDAV helpers",
        version: "1.2.3",
      },
    ]);

    await runCommand(["skills", "search", "calendar"]);

    expect(searchSkillsFromLittleBabyHubMock).toHaveBeenCalledWith({
      query: "calendar",
      limit: undefined,
    });
    expect(runtimeLogs.some((line) => line.includes("calendar v1.2.3  Calendar"))).toBe(true);
  });

  it("installs a skill from LittleBabyHub into the active workspace", async () => {
    installSkillFromLittleBabyHubMock.mockResolvedValue({
      ok: true,
      slug: "calendar",
      version: "1.2.3",
      targetDir: "/tmp/workspace/skills/calendar",
    });

    await runCommand(["skills", "install", "calendar", "--version", "1.2.3"]);

    expect(installSkillFromLittleBabyHubMock).toHaveBeenCalledWith({
      workspaceDir: "/tmp/workspace",
      slug: "calendar",
      version: "1.2.3",
      force: false,
      logger: expect.any(Object),
    });
    expect(
      runtimeLogs.some((line) =>
        line.includes("Installed calendar@1.2.3 -> /tmp/workspace/skills/calendar"),
      ),
    ).toBe(true);
  });

  it("updates all tracked LittleBabyHub skills", async () => {
    readTrackedLittleBabyHubSkillSlugsMock.mockResolvedValue(["calendar"]);
    updateSkillsFromLittleBabyHubMock.mockResolvedValue([
      {
        ok: true,
        slug: "calendar",
        previousVersion: "1.2.2",
        version: "1.2.3",
        changed: true,
        targetDir: "/tmp/workspace/skills/calendar",
      },
    ]);

    await runCommand(["skills", "update", "--all"]);

    expect(readTrackedLittleBabyHubSkillSlugsMock).toHaveBeenCalledWith("/tmp/workspace");
    expect(updateSkillsFromLittleBabyHubMock).toHaveBeenCalledWith({
      workspaceDir: "/tmp/workspace",
      slug: undefined,
      logger: expect.any(Object),
    });
    expect(runtimeLogs.some((line) => line.includes("Updated calendar: 1.2.2 -> 1.2.3"))).toBe(
      true,
    );
    expect(runtimeErrors).toEqual([]);
  });

  it.each([
    {
      label: "list",
      argv: ["skills", "list", "--json"],
      assert: (payload: Record<string, unknown>) => {
        const skills = payload.skills as Array<Record<string, unknown>>;
        expect(skills).toHaveLength(1);
        expect(skills[0]?.name).toBe("calendar");
      },
    },
    {
      label: "info",
      argv: ["skills", "info", "calendar", "--json"],
      assert: (payload: Record<string, unknown>) => {
        expect(payload.name).toBe("calendar");
        expect(payload.primaryEnv).toBe("CALENDAR_API_KEY");
      },
    },
    {
      label: "check",
      argv: ["skills", "check", "--json"],
      assert: (payload: Record<string, unknown>) => {
        expect(payload.summary).toMatchObject({
          total: 1,
          eligible: 1,
        });
      },
    },
  ])("routes skills $label JSON output through stdout", async ({ argv, assert }) => {
    await runCommand(argv);

    expect(buildWorkspaceSkillStatusMock).toHaveBeenCalledWith("/tmp/workspace", {
      config: {},
    });
    expect(
      defaultRuntime.writeStdout.mock.calls.length + defaultRuntime.writeJson.mock.calls.length,
    ).toBeGreaterThan(0);
    expect(defaultRuntime.log).not.toHaveBeenCalled();
    expect(runtimeErrors).toEqual([]);
    expect(runtimeStdout.length).toBeGreaterThan(0);

    const payload = JSON.parse(runtimeStdout.at(-1) ?? "{}") as Record<string, unknown>;
    assert(payload);
  });

  it("keeps non-JSON skills list output on stdout with human-readable formatting", async () => {
    await runCommand(["skills", "list"]);

    expect(defaultRuntime.writeStdout).toHaveBeenCalledTimes(1);
    expect(defaultRuntime.log).not.toHaveBeenCalled();
    expect(runtimeErrors).toEqual([]);
    expect(runtimeStdout.at(-1)).toContain("calendar");
    expect(runtimeStdout.at(-1)).toContain("littlebaby skills search");
  });
});
