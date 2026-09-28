const EARTH_RADIUS_KM = 6371;
const HALF_CIRCLE = 180;
const DECIMALS = 2;
const UNIT = "km";

export type Point = { latitude: number; longitude: number };

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / HALF_CIRCLE;
}

export function greatCircleKm(from: Point, to: Point): number {
  const latitude = toRadians(to.latitude - from.latitude);
  const longitude = toRadians(to.longitude - from.longitude);
  const chord =
    Math.sin(latitude / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(longitude / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(chord)));
}

export function formatDistance(kilometres: number): string {
  return `${Number(kilometres.toFixed(DECIMALS))} ${UNIT}`;
}
