const DECIMAL = /^-?\d+(\.\d+)?$/;
const WHOLE = /^-?\d+(\.0+)?$/;

function toNumber(raw: string): number | null {
  return DECIMAL.test(raw) ? Number(raw) : null;
}

export function toInteger(raw: string): number | null {
  if (!WHOLE.test(raw)) return null;

  const value = Number(raw);

  return Number.isSafeInteger(value) ? value : null;
}

export function requireNumber(raw: string): number {
  const value = toNumber(raw);

  if (value === null) throw new Error("expected a number");

  return value;
}

export function requireInteger(raw: string): number {
  const value = toInteger(raw);

  if (value === null) throw new Error("expected an integer");

  return value;
}
