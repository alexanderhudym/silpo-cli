import type { Command } from "commander";

import { silpo } from "../daemon/client.js";
import {
  DEFAULT_RADIUS_KM,
  addressCandidateText,
  foundAddressText,
  rankStores,
  savedAddressText,
  storeAddressText,
  type Coordinates,
  type MatchedParts,
  type MatchSignal,
  type MeasuredFrom,
  type RankedStore,
  type ServingBranch,
  type StoreListingFilter,
  type StoreRanking,
} from "../resolve/stores.js";
import { formatAddress, type BuildingComparison } from "../utils/address.js";
import { formatCoordinate } from "../utils/coordinate.js";
import { toLocalTime } from "../utils/datetime.js";
import { formatDistance } from "../utils/distance.js";
import { formatList, formatRows } from "../utils/list.js";
import { requireInteger, requireNumber } from "../utils/number.js";
import { formatEntryAsRow } from "../utils/record.js";

const PICKUP = { true: "pickup", false: "no pickup", null: "pickup unknown" };
const OPEN = { true: "open", false: "closed", null: "open unknown" };

const DEFAULT_LIMIT = 10;

const NOTHING_TO_RANK_BY =
  "nothing to rank stores by: no receipts and no saved delivery addresses; shop at a store, save a delivery address, or name a place in the query";

type StoresOptions = {
  pickup?: boolean;
  np?: boolean;
  radius?: string;
  limit?: string;
};

function filtersOf(options: StoresOptions): StoreListingFilter {
  return { hasPickup: options.pickup, hasNP: options.np };
}

function measuredFromText(measuredFrom: MeasuredFrom, point: Coordinates): string {
  const coordinates = `${formatCoordinate(point.latitude)}, ${formatCoordinate(point.longitude)}`;

  if (measuredFrom.kind === "coordinates") return coordinates;

  const name =
    measuredFrom.kind === "saved"
      ? [measuredFrom.address.tag, savedAddressText(measuredFrom.address) || undefined]
          .filter((value): value is string => Boolean(value))
          .join(", ")
      : measuredFrom.kind === "store"
        ? storeAddressText(measuredFrom.branch) || measuredFrom.branch.externalId || measuredFrom.branch.branchId
        : foundAddressText(measuredFrom.address);

  return name === "" ? coordinates : `${name} (${coordinates})`;
}

const TIEBREAK_TEXT: Record<"receipts" | "branch id", string> = {
  receipts: "receipt count",
  "branch id": "branch id",
};

function matchScoreText(score: number, previousScore: number | undefined): string {
  if (previousScore === undefined) return score.toFixed(2);

  for (let precision = 2; precision <= 6; precision += 1) {
    const text = score.toFixed(precision);

    if (text !== previousScore.toFixed(precision)) return text;
  }

  return score.toFixed(6);
}

const BUILDING_PART_TEXT: Partial<Record<BuildingComparison, string>> = {
  equal: "building",
  numeric: "building number",
  conflicting: "conflicting building",
};

function matchedPartsText(parts: MatchedParts): string {
  const clauses = [parts.settlement && "settlement", parts.street && "street", BUILDING_PART_TEXT[parts.building]]
    .filter((value): value is string => Boolean(value));

  return clauses.length > 0 ? clauses.join(", ") : "nothing named";
}

function matchReasonText(match: MatchSignal, previousScore: number | undefined): string {
  if (match.kind === "handle") return "resolved by store handle";
  if (match.kind === "settlement") {
    return "the answer rests on the candidate's settlement, its street having matched no store";
  }

  const parts = matchedPartsText(match.parts);

  if (match.tiebreak !== undefined) {
    return (
      `tied with the store above on score ${match.score.toFixed(2)} (matched ${parts}); ` +
      `order settled by ${TIEBREAK_TEXT[match.tiebreak]}`
    );
  }

  return `matched ${parts}, score ${matchScoreText(match.score, previousScore)}`;
}

function storeReasonText(store: RankedStore, previous: RankedStore | undefined): string | false {
  const clauses: string[] = [];

  if (store.receipts) {
    const { count, lastPurchasedAt } = store.receipts;

    clauses.push(`${count} receipt${count === 1 ? "" : "s"}, last ${toLocalTime(lastPurchasedAt)}`);
  }

  if (store.match) {
    const previousScore = previous?.match?.kind === "address" ? previous.match.score : undefined;

    clauses.push(matchReasonText(store.match, previousScore));
  }

  if (store.distance) {
    const { kilometres, point, measuredFrom } = store.distance;

    clauses.push(`${formatDistance(kilometres)} from ${measuredFromText(measuredFrom, point)}`);
  }

  return clauses.length > 0 && clauses.join("; ");
}

function storeRecordText(store: RankedStore, previous: RankedStore | undefined): string {
  const { branch } = store;
  const { branchId, companyId, externalId, city, address, latitude, longitude, hasPickup, open } = branch;
  const place = formatAddress({ city, street: address });

  return formatRows([
    formatEntryAsRow("id", branchId),
    externalId && formatEntryAsRow("code", externalId),
    companyId && formatEntryAsRow("companyId", companyId),
    place !== "" && formatEntryAsRow("address", place),
    latitude !== null &&
      longitude !== null &&
      formatEntryAsRow(
        "coordinates",
        `${formatCoordinate(latitude)}, ${formatCoordinate(longitude)}`,
      ),
    PICKUP[String(hasPickup) as keyof typeof PICKUP],
    OPEN[String(open) as keyof typeof OPEN],
    storeReasonText(store, previous),
  ]);
}

function resolvedPlaceText(
  ranking: Extract<StoreRanking, { outcome: "ranked" }>,
  query: string | undefined,
): string | false {
  if (ranking.resolvedPlaces === undefined || ranking.resolvedPlaces.length === 0) return false;

  const places =
    ranking.resolvedPlaces.length === 1
      ? addressCandidateText(ranking.resolvedPlaces[0]!)
      : formatList([
          `Resolved to ${ranking.resolvedPlaces.length} places`,
          formatList(ranking.resolvedPlaces.map(addressCandidateText)),
        ]);

  const lookedUp =
    ranking.probe !== undefined && ranking.probe !== query?.trim()
      ? formatEntryAsRow("looked up", ranking.probe)
      : false;

  return formatRows([places, lookedUp]);
}

function servingBranchLabel(entry: ServingBranch, filterNames: readonly string[]): string {
  if (entry.outcome === "unserved") return "unserved";

  const { branch } = entry;
  const label = storeAddressText(branch) || branch.externalId || branch.branchId;

  return entry.excludedByFilter ? filteredNote(label, filterNames) : label;
}

function servingBranchesText(
  servingBranches: readonly ServingBranch[] | undefined,
  filterNames: readonly string[],
): string | false {
  if (servingBranches === undefined || servingBranches.length === 0) return false;

  return formatRows([
    "Delivery types serving this point",
    ...servingBranches.map((entry) => formatEntryAsRow(entry.deliveryType, servingBranchLabel(entry, filterNames))),
  ]);
}

function activeFilterNames(filter: StoreListingFilter): string[] {
  const names: string[] = [];

  if (filter.hasPickup !== undefined) names.push("--pickup");
  if (filter.hasNP !== undefined) names.push("--np");

  return names;
}

function filteredNote(base: string, filterNames: readonly string[]): string {
  if (filterNames.length === 0) return base;

  return `${base} (${filterNames.join(" or ")} may have excluded it)`;
}

function unjoinedNote(base: string, unjoined: number, filterNames: readonly string[]): string {
  if (unjoined === 0) return base;

  const plural = unjoined === 1 ? "" : "s";
  const cause =
    filterNames.length === 0
      ? "the listing has no code for"
      : `${filterNames.join(" or ")} may have excluded, or the listing has no code for`;

  return `${base} (${unjoined} receipt${plural} named a store ${cause})`;
}

function nothingToRankByMessage(
  receiptsRead: number,
  hasSavedAddresses: boolean,
  filterNames: readonly string[],
): string {
  if (receiptsRead === 0 && !hasSavedAddresses) return NOTHING_TO_RANK_BY;

  const holdings = [
    receiptsRead > 0 && `${receiptsRead} receipt${receiptsRead === 1 ? "" : "s"}`,
    hasSavedAddresses && "saved delivery addresses",
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" and ");

  const cause =
    filterNames.length > 0 ? `${filterNames.join(" and ")} left nothing that qualifies` : "none of it qualifies";

  return `nothing to rank stores by: the account has ${holdings}, but ${cause}; drop a filter, widen --radius, or name a place in the query`;
}

export function registerStoresCommand(program: Command): void {
  program
    .command("stores")
    .description(
      "Store listing ranked by relevance to the caller: with a query — a settlement, an address, a " +
        "coordinate pair, a store's branch uuid, its store code, or a place no store address contains " +
        "such as a district, a metro station or a landmark — the stores it matches come first, then " +
        "the stores within --radius of that point, nearest first; with no query, the caller's own " +
        "stores come first by receipt count, then the stores within the radius of a saved delivery " +
        "address. Narrowed by --pickup and --np before the ordering. A query that is not a coordinate " +
        "pair or a store handle is placed by the address lookup before anything is matched, every " +
        "candidate it returns is matched against the listing, and the answer names each place that " +
        "produced stores and says where a candidate's settlement answered because its street matched " +
        "no store; there is one reading, so none is marked less certain than another. The distance is " +
        "straight-line, not a route, and the whole store listing is read once per command.",
    )
    .argument(
      "[query]",
      "a settlement, an address, a coordinate pair, a store's branch uuid, its store code, or a " +
        "place no store address contains — a district, a metro station, a landmark",
    )
    .option("--pickup", "only stores with self pickup")
    .option("--np", "only stores with Nova Poshta")
    .option("--radius <km>", `radius bounding what counts as near, default ${DEFAULT_RADIUS_KM}`)
    .option("--limit <n>", `at most how many stores to print, default ${DEFAULT_LIMIT}`)
    .action(async (query: string | undefined, options: StoresOptions) => {
      const radiusKm = options.radius === undefined ? undefined : requireNumber(options.radius);
      const limit = options.limit === undefined ? DEFAULT_LIMIT : requireInteger(options.limit);
      const filterNames = activeFilterNames(filtersOf(options));

      const ranking = await rankStores(silpo, {
        query,
        radiusKm,
        filter: filtersOf(options),
      });

      if (ranking.outcome === "none") {
        throw new Error(
          unjoinedNote(
            nothingToRankByMessage(ranking.receiptsRead, ranking.hasSavedAddresses, filterNames),
            ranking.unjoinedReceipts,
            filterNames,
          ),
        );
      }
      if (ranking.outcome === "no-match") {
        throw new Error(
          unjoinedNote(
            filteredNote(`no store or place matched ${JSON.stringify(ranking.query)}`, filterNames),
            ranking.unjoinedReceipts,
            filterNames,
          ),
        );
      }
      if (ranking.outcome === "unknown-handle") {
        throw new Error(
          unjoinedNote(
            filteredNote(`no store named ${JSON.stringify(ranking.handle)}`, filterNames),
            ranking.unjoinedReceipts,
            filterNames,
          ),
        );
      }
      const page = ranking.stores.slice(0, limit);
      const summary = unjoinedNote(
        `Found ${page.length} stores (total: ${ranking.stores.length})`,
        ranking.unjoinedReceipts,
        filterNames,
      );

      process.stdout.write(
        `${formatList([
          resolvedPlaceText(ranking, query),
          summary,
          formatList(page.map((store, index) => storeRecordText(store, page[index - 1]))),
          servingBranchesText(ranking.servingBranches, filterNames),
        ])}\n`,
      );
    });
}
