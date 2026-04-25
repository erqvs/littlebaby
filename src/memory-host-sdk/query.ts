const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "with",
]);

export function isQueryStopWordToken(token: string): boolean {
  return STOP_WORDS.has(token.trim().toLowerCase());
}

export function extractKeywords(input: string, limit = 12): string[] {
  return Array.from(
    new Set(
      input
        .split(/[^\p{L}\p{N}_-]+/u)
        .map((token) => token.trim())
        .filter((token) => token.length > 1 && !isQueryStopWordToken(token)),
    ),
  ).slice(0, limit);
}
