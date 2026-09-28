export function toOneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeForMatch(value: string): string {
  return toOneLine(value).toLowerCase();
}

export function exactlyOneMatching<T>(
  text: string,
  candidates: readonly T[],
  textOf: (candidate: T) => string,
): T | null {
  const needle = normalizeForMatch(text);

  if (needle === "") return null;

  const matches = candidates.filter((candidate) => normalizeForMatch(textOf(candidate)) === needle);

  return matches.length === 1 ? matches[0]! : null;
}
