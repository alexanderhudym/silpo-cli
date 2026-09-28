import type { PackUnit, Specification } from "./normalize.js";

export interface ParsedProductName {
  specification: Specification | undefined;
  packSize: number | undefined;
  packUnit: PackUnit | undefined;
}

const PACK_UNITS: readonly PackUnit[] = ["кг", "мл", "г", "л"];
const NUMBER = "\\d+(?:[.,]\\d+)?";
const PERCENT = new RegExp(`(?<![\\p{L}\\d])(${NUMBER})\\s*%`, "u");
const PACK = new RegExp(`(?<![\\p{L}\\d])(${NUMBER})\\s*(${PACK_UNITS.join("|")})(?![\\p{L}])`, "u");

function toAmount(raw: string): number {
  return Number(raw.replace(",", "."));
}

export function parseProductName(name: string): ParsedProductName {
  const percent = PERCENT.exec(name);
  const pack = PACK.exec(name);

  return {
    specification: percent ? { kind: "percentage", value: toAmount(percent[1]!) } : undefined,
    packSize: pack ? toAmount(pack[1]!) : undefined,
    packUnit: pack ? (pack[2] as PackUnit) : undefined,
  };
}
