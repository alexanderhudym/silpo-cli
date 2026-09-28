export type PackUnit = "г" | "кг" | "мл" | "л";

export interface PercentageSpecification {
  kind: "percentage";
  value: number;
}

export type Specification = PercentageSpecification;

export interface PackCandidate {
  value: number;
  unit: PackUnit;
}

export interface ParsedItem {
  term: string;
  quantity: number | undefined;
  specification: Specification | undefined;
  packCandidate: PackCandidate | undefined;
  /**
   * A number written in pieces, which the parser cannot read on its own: `яйця курячі 10 шт` names
   * the pack a carton comes in, `авокадо 2 шт` names how many to buy, and the two are written
   * identically. Only the product settles it, so the number is carried here and read at resolution.
   */
  countCandidate: number | undefined;
}

const PACK_UNITS: readonly PackUnit[] = ["кг", "мл", "г", "л"];
const NUMBER = "\\d+(?:[.,]\\d+)?";
const PERCENT = new RegExp(`^(${NUMBER})%$`, "u");
const PACK = new RegExp(`^(${NUMBER})(${PACK_UNITS.join("|")})$`, "u");
const BARE_NUMBER = new RegExp(`^${NUMBER}$`, "u");
const LONE_UNIT = new RegExp(`^(${PACK_UNITS.join("|")})$`, "u");
/**
 * Names the unit a count is written in, never the product, so it is read and not searched for —
 * whether it was written apart from the number or against it, both being ordinary on a list.
 */
const COUNT_UNIT = /^шт\.?$/u;
const COUNTED = new RegExp(`^(${NUMBER})шт\\.?$`, "u");

function toAmount(raw: string): number {
  return Number(raw.replace(",", "."));
}

export function formatSpecification(specification: Specification): string {
  return String(specification.value);
}

export function parseItem(text: string): ParsedItem {
  const words = text.trim().split(/\s+/u).filter((word) => word.length > 0);
  const term: string[] = [];
  let quantity: number | undefined;
  let specification: Specification | undefined;
  let packCandidate: PackCandidate | undefined;
  let countCandidate: number | undefined;

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index]!;
    const percent = PERCENT.exec(word);

    if (percent) {
      specification = { kind: "percentage", value: toAmount(percent[1]!) };
      continue;
    }

    const counted = COUNTED.exec(word);

    if (counted) {
      countCandidate = toAmount(counted[1]!);
      continue;
    }

    const pack = PACK.exec(word);

    if (pack) {
      packCandidate = { value: toAmount(pack[1]!), unit: pack[2] as PackUnit };
      continue;
    }

    if (BARE_NUMBER.test(word)) {
      const next = words[index + 1];

      if (next !== undefined && LONE_UNIT.test(next)) {
        packCandidate = { value: toAmount(word), unit: next as PackUnit };
        index += 1;
        continue;
      }

      if (next !== undefined && COUNT_UNIT.test(next)) {
        countCandidate = toAmount(word);
        index += 1;
        continue;
      }

      quantity = toAmount(word);

      continue;
    }

    term.push(word);
  }

  return {
    term: term.join(" "),
    quantity,
    specification,
    packCandidate,
    countCandidate,
  };
}
