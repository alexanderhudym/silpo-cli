import { toOneLine } from "./text.js";

const CURRENCY = "₴";
const PER = "/";
const BEFORE_SIZE = " ";
const BEFORE_PRICE = " — ";
const PREVIOUS = " was ";
const PIECE = "шт";

export const KILOGRAM = "кг";

const WEIGHT = new Set([KILOGRAM, "г"]);

export type PricedName = {
  name: string;
  price?: number;
  size?: string | null;
  oldPrice?: number | null;
  unit?: string | null;
};

export function formatPricedName({ name, price, size, oldPrice, unit }: PricedName): string {
  const titled = size ? `${toOneLine(name)}${BEFORE_SIZE}${size}` : toOneLine(name);

  if (price === undefined) return titled;

  const amount = unit ? `${price} ${CURRENCY}${PER}${unit}` : `${price} ${CURRENCY}`;
  const before = oldPrice === null || oldPrice === undefined ? "" : `${PREVIOUS}${oldPrice}`;

  return `${titled}${BEFORE_PRICE}${amount}${before}`;
}

export function formatAmount(value: number, unit: string | null): string {
  return unit === null ? String(value) : `${value}${unit}`;
}

export function isWeightUnit(unit: string | null): boolean {
  return unit !== null && WEIGHT.has(unit);
}

export function isPieceUnit(unit: string | null): boolean {
  return unit === PIECE;
}
