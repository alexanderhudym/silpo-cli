export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`expected JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function requireJsonObject(raw: string): Record<string, unknown> {
  const value = parseJson(raw);

  if (!isJsonObject(value)) throw new Error("expected a JSON object");

  return value;
}
