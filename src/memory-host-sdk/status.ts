type Tone = "ok" | "warn" | "bad" | "muted";

export function resolveMemoryVectorState(value: unknown): { state: string; tone: Tone } {
  void value;
  return { state: "disabled", tone: "muted" };
}

export function resolveMemoryFtsState(value: unknown): { state: string; tone: Tone } {
  void value;
  return { state: "disabled", tone: "muted" };
}

export function resolveMemoryCacheSummary(value: unknown): { text: string; tone: Tone } {
  void value;
  return { text: "disabled", tone: "muted" };
}
