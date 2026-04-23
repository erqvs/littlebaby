import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");

type GuidanceCase = {
  file: string;
  required?: string[];
  forbidden?: string[];
};

const CASES: GuidanceCase[] = [
  {
    file: "skills/session-logs/SKILL.md",
    required: ["LITTLEBABY_STATE_DIR"],
    forbidden: [
      "for f in ~/.littlebaby/agents/<agentId>/sessions/*.jsonl",
      'rg -l "phrase" ~/.littlebaby/agents/<agentId>/sessions/*.jsonl',
      "~/.littlebaby/agents/<agentId>/sessions/<id>.jsonl",
    ],
  },
  {
    file: "skills/gh-issues/SKILL.md",
    required: ["LITTLEBABY_CONFIG_PATH"],
    forbidden: ["cat ~/.littlebaby/littlebaby.json"],
  },
  {
    file: "skills/canvas/SKILL.md",
    required: ["LITTLEBABY_CONFIG_PATH"],
    forbidden: ["cat ~/.littlebaby/littlebaby.json"],
  },
  {
    file: "skills/openai-whisper-api/SKILL.md",
    required: ["LITTLEBABY_CONFIG_PATH"],
  },
  {
    file: "skills/sherpa-onnx-tts/SKILL.md",
    required: [
      "LITTLEBABY_STATE_DIR",
      "LITTLEBABY_CONFIG_PATH",
      'STATE_DIR="${LITTLEBABY_STATE_DIR:-$HOME/.littlebaby}"',
    ],
    forbidden: [
      'SHERPA_ONNX_RUNTIME_DIR: "~/.littlebaby/tools/sherpa-onnx-tts/runtime"',
      'SHERPA_ONNX_MODEL_DIR: "~/.littlebaby/tools/sherpa-onnx-tts/models/vits-piper-en_US-lessac-high"',
      "<state-dir>",
    ],
  },
  {
    file: "skills/coding-agent/SKILL.md",
    required: ["LITTLEBABY_STATE_DIR"],
    forbidden: ["NEVER start Codex in ~/.littlebaby/"],
  },
];

describe("bundled skill env-path guidance", () => {
  it.each(CASES)(
    "keeps $file aligned with LITTLEBABY env overrides",
    ({ file, required, forbidden }) => {
      const content = fs.readFileSync(path.join(REPO_ROOT, file), "utf8");
      for (const needle of required ?? []) {
        expect(content).toContain(needle);
      }
      for (const needle of forbidden ?? []) {
        expect(content).not.toContain(needle);
      }
    },
  );
});
