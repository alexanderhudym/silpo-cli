const TRUE_WORDS = new Set(["true", "1", "yes", "y"]);
const FALSE_WORDS = new Set(["false", "0", "no", "n"]);

export function toBoolean(raw: string): boolean | null {
  const word = raw.trim().toLowerCase();

  if (TRUE_WORDS.has(word)) return true;
  if (FALSE_WORDS.has(word)) return false;

  return null;
}

export function requireBoolean(raw: string): boolean {
  const value = toBoolean(raw);

  if (value === null) throw new Error("expected true or false");

  return value;
}
