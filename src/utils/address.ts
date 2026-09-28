import { normalizeForMatch, toOneLine } from "./text.js";

const BUILDING = "буд.";
const ENTRANCE = "під.";
const FLOOR = "пов.";
const APARTMENT = "кв.";

const STREET_TYPE_ALIASES: Readonly<Record<string, readonly string[]>> = {
  "вулиця": ["вул", "ул", "улица"],
  "проспект": ["просп"],
  "провулок": ["пров", "переулок"],
  "бульвар": ["бул", "бульв"],
  "площа": ["пл", "площадь"],
  "набережна": ["наб", "набережная"],
  "шосе": ["шоссе"],
  "дорога": ["дор"],
  "майдан": [],
};

const BUILDING_PREFIX_WORDS: readonly string[] = ["буд", "б", "д"];

function replaceWord(text: string, word: string, replacement: string): string {
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${word}\\.?(?=$|[^\\p{L}\\p{N}])`, "giu");

  return text.replace(pattern, (_match, before: string) => `${before}${replacement}`);
}

export function canonicalizeAddressWords(value: string): string {
  let result = normalizeForMatch(value);

  for (const [canonical, aliases] of Object.entries(STREET_TYPE_ALIASES)) {
    for (const alias of aliases) result = replaceWord(result, alias, canonical);
  }

  for (const prefix of BUILDING_PREFIX_WORDS) result = replaceWord(result, prefix, "");

  return normalizeForMatch(result);
}

const STREET_TYPE_WORDS: ReadonlySet<string> = new Set(
  Object.entries(STREET_TYPE_ALIASES).flatMap(([canonical, aliases]) => [canonical, ...aliases]),
);

function bareStreetTypeWord(token: string): string {
  return token.toLowerCase().replace(/\.$/, "");
}

export function stripStreetTypeWords(text: string): string {
  return text
    .split(" ")
    .filter((token) => token !== "" && !STREET_TYPE_WORDS.has(bareStreetTypeWord(token)))
    .join(" ");
}

function splitLeadingStreetType(text: string): { streetType?: string; street: string } {
  const trimmed = text.trim();

  if (trimmed === "") return { street: "" };

  const spaceIndex = trimmed.indexOf(" ");
  const firstToken = spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex);

  if (!STREET_TYPE_WORDS.has(bareStreetTypeWord(firstToken))) return { street: trimmed };

  return {
    streetType: firstToken,
    street: spaceIndex === -1 ? "" : trimmed.slice(spaceIndex + 1).trim(),
  };
}

export type AddressParts = {
  readonly streetType?: string;
  readonly street: string;
  readonly building?: string;
};

export function splitAddress(text: string): AddressParts {
  const trimmed = toOneLine(text);

  if (trimmed === "") return { street: "" };

  const commaIndex = trimmed.lastIndexOf(",");

  if (commaIndex !== -1) {
    const tail = trimmed.slice(commaIndex + 1).trim();

    if (/\d/.test(tail)) {
      return { ...splitLeadingStreetType(trimmed.slice(0, commaIndex).trim()), building: tail };
    }
  }

  const tokens = trimmed.split(" ");
  const buildingIndex = tokens.findIndex((token) => /^\d/.test(token));

  if (buildingIndex === -1) return splitLeadingStreetType(trimmed);

  const building = tokens[buildingIndex]!;
  const streetTokens = [...tokens.slice(0, buildingIndex), ...tokens.slice(buildingIndex + 1)];

  return { ...splitLeadingStreetType(streetTokens.join(" ")), building };
}

export type BuildingComparison = "equal" | "numeric" | "conflicting" | "absent";

function buildingNumericPart(building: string): string {
  return building.match(/^\d+/)?.[0] ?? "";
}

export function compareBuildingNumbers(
  a: string | undefined,
  b: string | undefined,
): BuildingComparison {
  const left = a?.trim() ?? "";
  const right = b?.trim() ?? "";

  if (left === "" || right === "") return "absent";
  if (left.toUpperCase() === right.toUpperCase()) return "equal";

  const leftNumeric = buildingNumericPart(left);
  const rightNumeric = buildingNumericPart(right);

  if (leftNumeric !== "" && leftNumeric === rightNumeric) return "numeric";

  return "conflicting";
}

export type Address = {
  city?: string | null;
  street?: string | null;
  building?: string | null;
  entrance?: string | null;
  floor?: string | null;
  apartment?: string | null;
};

export function formatAddress({
  city,
  street,
  building,
  entrance,
  floor,
  apartment,
}: Address): string {
  return [
    city,
    street,
    building && `${BUILDING} ${building}`,
    entrance && `${ENTRANCE} ${entrance}`,
    floor && `${FLOOR} ${floor}`,
    apartment && `${APARTMENT} ${apartment}`,
  ]
    .filter(Boolean)
    .join(", ");
}
