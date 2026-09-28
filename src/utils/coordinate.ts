const DECIMALS = 6;

export type Coordinates = { latitude: number; longitude: number };

export function formatCoordinate(value: string | number): string {
  const degrees = Number(value);

  return Number.isFinite(degrees)
    ? String(Number(degrees.toFixed(DECIMALS)))
    : String(value);
}

const COORDINATE_PAIR = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/;

export function parseCoordinatePair(text: string): Coordinates | null {
  const match = COORDINATE_PAIR.exec(text.trim());

  if (match === null) return null;

  return { latitude: Number(match[1]), longitude: Number(match[2]) };
}
