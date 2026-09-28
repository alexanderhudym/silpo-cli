import MiniSearch from "minisearch";
import { OFFLINE_ORDERS_CAP } from "../mcp/silpo.js";

import type { FoundAddress, SavedAddress } from "../mcp/entities/address.js";
import type { Branch } from "../mcp/entities/branch.js";
import type { DeliveryOption } from "../mcp/entities/delivery.js";
import type { OfflineOrder } from "../mcp/entities/order.js";
import type { SilpoSurface } from "../mcp/surface.js";
import {
  canonicalizeAddressWords,
  compareBuildingNumbers,
  formatAddress,
  splitAddress,
  stripStreetTypeWords,
  type BuildingComparison,
} from "../utils/address.js";
import { formatCoordinate, parseCoordinatePair, type Coordinates } from "../utils/coordinate.js";
import { greatCircleKm } from "../utils/distance.js";
import { formatList, formatRows } from "../utils/list.js";
import { paginate } from "../utils/paginate.js";
import { formatEntryAsRow } from "../utils/record.js";
import { exactlyOneMatching, normalizeForMatch, toOneLine } from "../utils/text.js";

export type { Coordinates };

export type AddressClient = Pick<SilpoSurface, "findAddress">;
export type PlaceClient = AddressClient &
  Pick<
    SilpoSurface,
    "listBranches" | "getMyDeliveryAddresses" | "getMyOfflineOrders" | "getAvailableDeliveryTypes"
  >;

const STORE_PAGE_SIZE = 500;

const STORE_BOUNDING_BOX = {
  minLatitude: 44.0,
  maxLatitude: 52.5,
  minLongitude: 22.0,
  maxLongitude: 40.5,
} as const;

export type AddressResolution =
  | { readonly outcome: "resolved"; readonly address: FoundAddress }
  | { readonly outcome: "ambiguous"; readonly summary: string; readonly candidates: readonly FoundAddress[] }
  | { readonly outcome: "none" };

export type PlaceCandidate =
  | { readonly kind: "saved"; readonly address: SavedAddress }
  | { readonly kind: "store"; readonly branch: Branch }
  | { readonly kind: "address"; readonly address: FoundAddress };

export type PlaceResolution =
  | { readonly outcome: "resolved"; readonly candidate: PlaceCandidate }
  | { readonly outcome: "ambiguous"; readonly candidates: readonly PlaceCandidate[] }
  | { readonly outcome: "none" };

function hasCoordinates(latitude: string | number | null, longitude: string | number | null): boolean {
  return latitude !== null && longitude !== null;
}

export function matchSavedAddresses(
  text: string,
  addresses: readonly SavedAddress[],
): SavedAddress[] {
  const needle = normalizeForMatch(text);

  if (needle === "") return [];

  return addresses.filter((address) => {
    if (!hasCoordinates(address.latitude, address.longitude)) return false;

    const place = formatAddress({
      city: address.city,
      street: address.street,
      building: address.building,
    });

    return (
      (address.tag !== null && normalizeForMatch(address.tag).includes(needle)) ||
      (place !== "" && normalizeForMatch(place).includes(needle))
    );
  });
}

const HOME_WORDS: readonly string[] = ["дім", "дом", "house", "квартира"];
const HOME_CANONICAL = "дім";

function replaceWholeWord(text: string, word: string, replacement: string): string {
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${word}(?=$|[^\\p{L}\\p{N}])`, "giu");

  return text.replace(pattern, (_match, before: string) => `${before}${replacement}`);
}

function canonicalizeHomeWords(text: string): string {
  return HOME_WORDS.reduce(
    (result, word) => replaceWholeWord(result, word, HOME_CANONICAL),
    normalizeForMatch(text),
  );
}

export function matchSavedAddressesForRanking(
  text: string,
  addresses: readonly SavedAddress[],
): SavedAddress[] {
  const canonicalText = canonicalizeHomeWords(text);

  if (canonicalText === "") return [];

  const decorated = addresses.map((address) => ({
    ...address,
    tag: address.tag === null ? null : canonicalizeHomeWords(address.tag),
  }));

  const matchedIds = new Set(matchSavedAddresses(canonicalText, decorated).map((address) => address.id));

  return addresses.filter((address) => matchedIds.has(address.id));
}

export function matchStores(text: string, branches: readonly Branch[]): Branch[] {
  const needle = normalizeForMatch(text);

  if (needle === "") return [];

  return branches.filter((branch) => {
    const place = formatAddress({ city: branch.city, street: branch.address });

    return place !== "" && normalizeForMatch(place).includes(needle);
  });
}

export type MatchedParts = {
  readonly settlement: boolean;
  readonly street: boolean;
  readonly building: BuildingComparison;
};

export type StoreMatch =
  | { readonly branch: Branch; readonly score: number; readonly kind: "handle" }
  | {
      readonly branch: Branch;
      readonly score: number;
      readonly kind: "address";
      readonly parts: MatchedParts;
    };

type StoreDocument = {
  readonly id: string;
  readonly street: string;
  readonly city: string;
};

const STORE_MATCH_RELEVANCE_RATIO = 0.2;
const STORE_MATCH_DISCRIMINATION_SHARE = 0.5;
const STORE_MATCH_FUZZY_MIN_LENGTH = 5;
const STORE_MATCH_FUZZY_RATIO = 0.2;
const STORE_MATCH_BUILDING_EXACT_MULTIPLIER = 2;
const STORE_MATCH_BUILDING_NUMERIC_MULTIPLIER = 1.3;
const STORE_MATCH_BUILDING_CONFLICT_MULTIPLIER = 0.4;

function branchStreet(branch: Branch): string {
  return splitAddress(branch.address ?? "").street;
}

function branchBuilding(branch: Branch): string | undefined {
  return splitAddress(branch.address ?? "").building;
}

function storeStreetText(text: string): string {
  return canonicalizeAddressWords(stripStreetTypeWords(text));
}

function storeStreetDocument(branch: Branch): StoreDocument {
  return {
    id: branch.branchId,
    street: storeStreetText(branchStreet(branch)),
    city: branch.city ?? "",
  };
}

type QueryAddress = {
  readonly settlement: string | null;
  readonly building: string | undefined;
  readonly street: string;
};

function candidateAddressParts(
  candidate: Pick<FoundAddress, "city" | "street" | "houseNumber">,
): QueryAddress {
  return {
    settlement: candidate.city,
    building: candidate.houseNumber ?? undefined,
    street: storeStreetText(candidate.street ?? ""),
  };
}

function buildingMultiplierFromComparison(comparison: BuildingComparison): number {
  if (comparison === "equal") return STORE_MATCH_BUILDING_EXACT_MULTIPLIER;
  if (comparison === "numeric") return STORE_MATCH_BUILDING_NUMERIC_MULTIPLIER;
  if (comparison === "conflicting") return STORE_MATCH_BUILDING_CONFLICT_MULTIPLIER;

  return 1;
}

function termDocumentShare(
  index: MiniSearch<StoreDocument>,
  term: string,
  totalDocuments: number,
  cache: Map<string, number>,
): number {
  const cached = cache.get(term);

  if (cached !== undefined) return cached;

  const share = totalDocuments === 0
    ? 0
    : index.search(term, { prefix: false, combineWith: "OR" }).length / totalDocuments;

  cache.set(term, share);

  return share;
}

function hasDiscriminatingMatch(
  index: MiniSearch<StoreDocument>,
  matchedTerms: readonly string[],
  totalDocuments: number,
  cache: Map<string, number>,
): boolean {
  return matchedTerms.some(
    (term) => termDocumentShare(index, term, totalDocuments, cache) <= STORE_MATCH_DISCRIMINATION_SHARE,
  );
}

function matchParsedStoresByRelevance(
  branches: readonly Branch[],
  queryAddress: QueryAddress,
): StoreMatch[] {
  const { settlement, building, street } = queryAddress;

  if (street === "") {
    if (settlement === null) return [];

    return branches
      .filter((branch) => branch.city === settlement)
      .map((branch) => {
        const buildingComparison = compareBuildingNumbers(building, branchBuilding(branch));

        return {
          branch,
          score: buildingMultiplierFromComparison(buildingComparison),
          kind: "address" as const,
          parts: { settlement: true, street: false, building: buildingComparison },
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  const index = new MiniSearch<StoreDocument>({
    fields: ["street"],
    idField: "id",
    storeFields: ["city"],
  });

  index.addAll(branches.map(storeStreetDocument));

  const results = index.search(street, {
    prefix: true,
    fuzzy: (term) => (term.length >= STORE_MATCH_FUZZY_MIN_LENGTH ? STORE_MATCH_FUZZY_RATIO : false),
    combineWith: "OR",
    filter: (result) => settlement === null || result.city === settlement,
  });

  if (results.length === 0) return [];

  const byId = new Map(branches.map((branch) => [branch.branchId, branch] as const));

  const scored = results.map((result) => {
    const branch = byId.get(String(result.id))!;
    const buildingComparison = compareBuildingNumbers(building, branchBuilding(branch));

    return {
      branch,
      result,
      buildingComparison,
      score: result.score * buildingMultiplierFromComparison(buildingComparison),
    };
  });

  const floor = Math.max(...scored.map((entry) => entry.score)) * STORE_MATCH_RELEVANCE_RATIO;
  const documentShareCache = new Map<string, number>();

  return scored
    .filter((entry) => entry.score >= floor)
    .filter((entry) =>
      hasDiscriminatingMatch(index, Object.keys(entry.result.match), branches.length, documentShareCache),
    )
    .sort((a, b) => b.score - a.score)
    .map((entry) => ({
      branch: entry.branch,
      score: entry.score,
      kind: "address" as const,
      parts: { settlement: settlement !== null, street: true, building: entry.buildingComparison },
    }));
}

export function matchStoresByRelevance(
  candidate: Pick<FoundAddress, "city" | "street" | "houseNumber">,
  branches: readonly Branch[],
): StoreMatch[] {
  return matchParsedStoresByRelevance(branches, candidateAddressParts(candidate));
}

export type StoreListingFilter = { hasPickup?: boolean; hasNP?: boolean };

function isUsableStoreRecord(branch: Branch): boolean {
  const hasPlace = Boolean(branch.city) || Boolean(branch.address);

  if (!hasPlace) return false;
  if (branch.latitude === null || branch.longitude === null) return true;

  const latitude = Number(branch.latitude);
  const longitude = Number(branch.longitude);

  return (
    latitude >= STORE_BOUNDING_BOX.minLatitude &&
    latitude <= STORE_BOUNDING_BOX.maxLatitude &&
    longitude >= STORE_BOUNDING_BOX.minLongitude &&
    longitude <= STORE_BOUNDING_BOX.maxLongitude
  );
}

export async function listStores(
  client: Pick<SilpoSurface, "listBranches">,
  filter: StoreListingFilter = {},
): Promise<{ branches: Branch[] }> {
  const branches = await paginate(STORE_PAGE_SIZE, async (limit, offset) => {
    const { structured } = await client.listBranches({ ...filter, limit, offset });

    return { rows: structured.branches, total: structured.meta.total };
  });

  return { branches: branches.filter(isUsableStoreRecord) };
}

export async function findBranch(
  client: Pick<SilpoSurface, "listBranches">,
  branchId: string,
  filter: StoreListingFilter = {},
): Promise<Branch | null> {
  const { branches } = await listStores(client, filter);

  return branches.find((branch) => branch.branchId === branchId) ?? null;
}

export function foundAddressText({ address, city, street, houseNumber }: FoundAddress): string {
  return address ?? formatAddress({ city, street, building: houseNumber });
}

function foundAddressMatchText(candidate: FoundAddress): string {
  return canonicalizeAddressWords(foundAddressText(candidate));
}

export function savedAddressText({ city, street, building }: SavedAddress): string {
  return formatAddress({ city, street, building });
}

export function storeAddressText({ city, address }: Branch): string {
  return formatAddress({ city, street: address });
}

export async function findAddressCandidates(
  client: AddressClient,
  text: string,
): Promise<readonly FoundAddress[]> {
  const { structured } = await client.findAddress({ address: text });

  return structured.addresses;
}

export async function resolveAddress(client: AddressClient, text: string): Promise<AddressResolution> {
  const { structured } = await client.findAddress({ address: text });
  const { addresses, summary } = structured;

  if (addresses.length === 0) return { outcome: "none" };
  if (addresses.length === 1) return { outcome: "resolved", address: addresses[0]! };

  const exact = exactlyOneMatching(canonicalizeAddressWords(text), addresses, foundAddressMatchText);

  if (exact !== null) return { outcome: "resolved", address: exact };

  return { outcome: "ambiguous", summary, candidates: addresses };
}

function resolved(candidate: PlaceCandidate): PlaceResolution {
  return { outcome: "resolved", candidate };
}

function ambiguous(candidates: readonly PlaceCandidate[]): PlaceResolution {
  return { outcome: "ambiguous", candidates };
}

export type DestinationScope = "store" | "courier" | "any";

export async function resolveDestination(
  client: PlaceClient,
  text: string,
  scope: DestinationScope = "any",
): Promise<PlaceResolution> {
  // A branch uuid names a store as surely as its address does, and more exactly: it is the handle
  // an ambiguity prints when two stores share an address string. Taking it here is what lets one
  // option carry every way of naming a destination.
  if (looksLikeUuid(text)) {
    const branch = await findBranch(client, text.trim());

    return branch === null ? { outcome: "none" } : resolved({ kind: "store", branch });
  }

  if (scope !== "store") {
    const { structured: saved } = await client.getMyDeliveryAddresses();
    const savedMatches = matchSavedAddresses(text, saved.addresses);

    if (savedMatches.length === 1) return resolved({ kind: "saved", address: savedMatches[0]! });
    if (savedMatches.length > 1) {
      const exact = exactlyOneMatching(text, savedMatches, savedAddressText);

      if (exact !== null) return resolved({ kind: "saved", address: exact });

      return ambiguous(savedMatches.map((address) => ({ kind: "saved", address }) as const));
    }
  }

  let branches: readonly Branch[] = [];

  if (scope !== "courier") {
    ({ branches } = await listStores(client));

    const storeMatches = matchStores(text, branches);

    if (storeMatches.length === 1) return resolved({ kind: "store", branch: storeMatches[0]! });
    if (storeMatches.length > 1) {
      const exact = exactlyOneMatching(text, storeMatches, storeAddressText);

      if (exact !== null) return resolved({ kind: "store", branch: exact });

      return ambiguous(storeMatches.map((branch) => ({ kind: "store", branch }) as const));
    }
  }

  const geocoded = await resolveAddress(client, text);

  // Containment reads one string for another and sees no difference between a word and its
  // abbreviation, so a caller who wrote the street type out in full misses a branch that shortens
  // it. The parsed comparison the store listing already uses does not care: the server hands back a
  // settlement, a street and a building, and those are compared part by part. It runs only where a
  // store is what was asked for — under `any` a home address standing on a street a branch is also
  // on would become a collection nobody requested.
  if (scope === "store") {
    // Every candidate, not only a lone resolved one: the geocoder answers a store's address with
    // several spellings of the same street, and several spellings converging on one branch is not
    // an ambiguity about which branch was meant. This is what the store listing command does, and
    // it is why that command finds stores this path used to miss.
    const geocodedCandidates =
      geocoded.outcome === "resolved"
        ? [geocoded.address]
        : geocoded.outcome === "ambiguous"
          ? geocoded.candidates
          : [];
    const byBranchId = new Map<string, Branch>();

    for (const candidate of geocodedCandidates) {
      for (const { branch } of matchStoresByRelevance(candidate, branches)) {
        byBranchId.set(branch.branchId, branch);
      }
    }

    const matched = [...byBranchId.values()];
    const only = matched[0];

    if (matched.length === 1 && only !== undefined) return resolved({ kind: "store", branch: only });
    if (matched.length > 1) {
      return ambiguous(matched.map((branch) => ({ kind: "store", branch }) as const));
    }
  }

  if (scope === "store") return { outcome: "none" };

  if (geocoded.outcome === "resolved") return resolved({ kind: "address", address: geocoded.address });
  if (geocoded.outcome === "ambiguous") {
    return ambiguous(geocoded.candidates.map((address) => ({ kind: "address", address }) as const));
  }

  return { outcome: "none" };
}

export function coordinatesOf(candidate: PlaceCandidate): Coordinates | null {
  if (candidate.kind === "saved") {
    const { latitude, longitude } = candidate.address;

    return latitude === null || longitude === null ? null : { latitude, longitude };
  }

  if (candidate.kind === "store") {
    const { latitude, longitude } = candidate.branch;

    return latitude === null || longitude === null
      ? null
      : { latitude: Number(latitude), longitude: Number(longitude) };
  }

  return { latitude: candidate.address.latitude, longitude: candidate.address.longitude };
}

export type ReceiptSignal = { readonly count: number; readonly lastPurchasedAt: string };

const OFFLINE_ORDERS_PAGE_SIZE = OFFLINE_ORDERS_CAP;
const HISTORY_PAGE_LIMIT = 5;

async function readOfflineOrders(
  client: Pick<SilpoSurface, "getMyOfflineOrders">,
): Promise<{ readonly orders: readonly OfflineOrder[] }> {
  const orders = await paginate<OfflineOrder>(OFFLINE_ORDERS_PAGE_SIZE, async (limit, offset) => {
    const { structured } = await client.getMyOfflineOrders({
      branchId: "",
      deliveryType: "",
      timeslotStart: "",
      timeslotEnd: "",
      limit,
      offset,
    });

    const total = Math.min(structured.meta.total, HISTORY_PAGE_LIMIT * OFFLINE_ORDERS_PAGE_SIZE);

    return { rows: structured.orders, total };
  });

  return { orders };
}

function joinReceipts(
  orders: readonly OfflineOrder[],
  branches: readonly Branch[],
): {
  readonly byBranchId: ReadonlyMap<string, ReceiptSignal>;
  readonly unjoined: number;
  readonly total: number;
} {
  const byBranchId = new Map<string, ReceiptSignal>();
  let unjoined = 0;

  const branchIdByExternalId = new Map(
    branches.flatMap((branch) =>
      branch.externalId === null ? [] : [[branch.externalId, branch.branchId] as const],
    ),
  );

  for (const order of orders) {
    const branchId = branchIdByExternalId.get(String(order.filId));

    if (branchId === undefined) {
      unjoined += 1;
      continue;
    }

    const previous = byBranchId.get(branchId);
    const newer = previous === undefined || Date.parse(order.createdAt) > Date.parse(previous.lastPurchasedAt);

    byBranchId.set(branchId, {
      count: (previous?.count ?? 0) + 1,
      lastPurchasedAt: newer ? order.createdAt : previous!.lastPurchasedAt,
    });
  }

  return { byBranchId, unjoined, total: orders.length };
}

export type ServingBranch =
  | {
      readonly deliveryType: string;
      readonly outcome: "served";
      readonly branch: Branch;
      readonly excludedByFilter: boolean;
    }
  | { readonly deliveryType: string; readonly outcome: "unserved" };

function servingBranchPlaceholder(branchId: string): Branch {
  return {
    branchId,
    companyId: null,
    externalId: null,
    city: null,
    address: null,
    latitude: null,
    longitude: null,
    hasPickup: null,
    open: null,
  };
}

function joinServingBranches(
  options: readonly DeliveryOption[],
  branches: readonly Branch[],
): ServingBranch[] {
  const byBranchId = new Map(branches.map((branch) => [branch.branchId, branch] as const));

  return options.map((option) => {
    if (option.branchId === null) return { deliveryType: option.deliveryType, outcome: "unserved" as const };

    const branch = byBranchId.get(option.branchId);

    return {
      deliveryType: option.deliveryType,
      outcome: "served" as const,
      branch: branch ?? servingBranchPlaceholder(option.branchId),
      excludedByFilter: branch === undefined,
    };
  });
}

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STORE_CODE_SHAPE = /^\d+$/;

export function looksLikeUuid(text: string): boolean {
  return UUID_SHAPE.test(text.trim());
}

function looksLikeStoreHandle(text: string, minimumNumericHandleLength: number): boolean {
  const trimmed = text.trim();

  if (UUID_SHAPE.test(trimmed)) return true;

  return STORE_CODE_SHAPE.test(trimmed) && trimmed.length >= minimumNumericHandleLength;
}

const NUMERIC_EXTERNAL_ID = /^\d+$/;
const HANDLE_UUID_TOKEN = /(?<![\p{L}\p{N}])[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?![\p{L}\p{N}])/giu;
const HANDLE_NUMBER_TOKEN = /(?<![\p{L}\p{N}])\d+(?![\p{L}\p{N}])/gu;

export function minimumNumericHandleLength(branches: readonly Branch[]): number {
  const numericExternalIdLengths = branches.flatMap((branch) =>
    branch.externalId !== null && NUMERIC_EXTERNAL_ID.test(branch.externalId) ? [branch.externalId.length] : [],
  );

  return numericExternalIdLengths.length === 0 ? Number.POSITIVE_INFINITY : Math.min(...numericExternalIdLengths);
}

export type HandleIndex = (query: string) => Branch | null;

export function buildHandleIndex(branches: readonly Branch[]): HandleIndex {
  const byBranchId = new Map(branches.map((branch) => [branch.branchId.toLowerCase(), branch] as const));
  const byExternalId = new Map(
    branches.flatMap((branch) =>
      branch.externalId === null ? [] : [[branch.externalId.toLowerCase(), branch] as const],
    ),
  );

  const minimumHandleLength = minimumNumericHandleLength(branches);

  return (query: string): Branch | null => {
    const trimmed = query.trim();

    if (trimmed === "") return null;

    const wholeQueryMatch = byExternalId.get(trimmed.toLowerCase());

    if (wholeQueryMatch !== undefined && !NUMERIC_EXTERNAL_ID.test(wholeQueryMatch.externalId ?? "")) {
      return wholeQueryMatch;
    }

    const uuidMatch = trimmed.match(HANDLE_UUID_TOKEN);

    if (uuidMatch !== null) {
      const branch = byBranchId.get(uuidMatch[0]!.toLowerCase());

      if (branch !== undefined) return branch;
    }

    const numberMatches = trimmed.match(HANDLE_NUMBER_TOKEN) ?? [];

    for (const token of numberMatches) {
      if (token.length < minimumHandleLength) continue;

      const branch = byExternalId.get(token);

      if (branch !== undefined) return branch;
    }

    return null;
  };
}

export type MeasuredFrom = PlaceCandidate | { readonly kind: "coordinates" };

export type LocatedPoint = { readonly point: Coordinates; readonly measuredFrom: MeasuredFrom };

type ResolvedQuery =
  | {
      readonly kind: "resolved";
      readonly matches: readonly StoreMatch[];
      readonly near: readonly RankedStore[];
      readonly points: readonly LocatedPoint[];
      readonly resolvedPlaces: readonly FoundAddress[];
      readonly probe?: string;
    }
  | { readonly kind: "unknown-handle"; readonly handle: string }
  | { readonly kind: "none" };

function sortMatchesByScoreThenReceipts(
  matches: readonly StoreMatch[],
  receiptsByBranchId: ReadonlyMap<string, ReceiptSignal>,
): StoreMatch[] {
  return [...matches].sort((a, b) => {
    const scoreDiff = b.score - a.score;

    return scoreDiff !== 0 ? scoreDiff : branchReceiptCompare(receiptsByBranchId)(a.branch, b.branch);
  });
}

function dedupeMatchesByBranch(matches: readonly StoreMatch[]): StoreMatch[] {
  const bestByBranch = new Map<string, StoreMatch>();

  for (const match of matches) {
    const existing = bestByBranch.get(match.branch.branchId);

    if (existing === undefined || match.score > existing.score) bestByBranch.set(match.branch.branchId, match);
  }

  return [...bestByBranch.values()];
}

function dedupeRankedByBranch(stores: readonly RankedStore[]): RankedStore[] {
  const bestByBranch = new Map<string, RankedStore>();

  for (const store of stores) {
    const existing = bestByBranch.get(store.branch.branchId);
    const kilometres = store.distance?.kilometres ?? Number.POSITIVE_INFINITY;
    const existingKilometres = existing?.distance?.kilometres ?? Number.POSITIVE_INFINITY;

    if (existing === undefined || kilometres < existingKilometres) bestByBranch.set(store.branch.branchId, store);
  }

  return [...bestByBranch.values()];
}

function sortRankedByDistance(
  stores: readonly RankedStore[],
  receiptsByBranchId: ReadonlyMap<string, ReceiptSignal>,
): RankedStore[] {
  return [...stores].sort((a, b) => {
    const distanceDiff = (a.distance?.kilometres ?? 0) - (b.distance?.kilometres ?? 0);

    return distanceDiff !== 0 ? distanceDiff : branchReceiptCompare(receiptsByBranchId)(a.branch, b.branch);
  });
}

type CandidateOutcome =
  | { readonly kind: "matched"; readonly candidate: FoundAddress; readonly matches: readonly StoreMatch[] }
  | {
      readonly kind: "settlement";
      readonly candidate: FoundAddress;
      readonly stores: readonly RankedStore[];
      readonly point: LocatedPoint;
    }
  | { readonly kind: "none"; readonly candidate: FoundAddress };

function resolveCandidateAgainstListing(
  candidate: FoundAddress,
  branches: readonly Branch[],
  radiusKm: number,
  receiptsByBranchId: ReadonlyMap<string, ReceiptSignal>,
): CandidateOutcome {
  const parts = candidateAddressParts(candidate);
  const matches = matchParsedStoresByRelevance(branches, parts);

  if (matches.length > 0) return { kind: "matched", candidate, matches };
  if (parts.street === "" || parts.settlement === null) return { kind: "none", candidate };

  const settlementBranches = branches.filter((branch) => branch.city === parts.settlement);
  const located: LocatedPoint = {
    point: { latitude: candidate.latitude, longitude: candidate.longitude },
    measuredFrom: { kind: "address", address: candidate },
  };
  const stores = nearestAmong(settlementBranches, [located], radiusKm, receiptsByBranchId).map((store) => ({
    ...store,
    match: { kind: "settlement" as const },
  }));

  return stores.length === 0 ? { kind: "none", candidate } : { kind: "settlement", candidate, stores, point: located };
}

async function resolveQuery(
  client: PlaceClient,
  text: string,
  branches: readonly Branch[],
  receiptsByBranchId: ReadonlyMap<string, ReceiptSignal>,
  radiusKm: number,
): Promise<ResolvedQuery> {
  const pair = parseCoordinatePair(text);

  if (pair !== null) {
    return {
      kind: "resolved",
      matches: [],
      near: [],
      points: [{ point: pair, measuredFrom: { kind: "coordinates" } }],
      resolvedPlaces: [],
    };
  }

  const handle = buildHandleIndex(branches)(text);

  if (handle !== null) {
    const candidate: PlaceCandidate = { kind: "store", branch: handle };
    const point = coordinatesOf(candidate);

    return {
      kind: "resolved",
      matches: [{ branch: handle, score: 1, kind: "handle" }],
      near: [],
      points: point === null ? [] : [{ point, measuredFrom: candidate }],
      resolvedPlaces: [],
    };
  }

  if (looksLikeStoreHandle(text, minimumNumericHandleLength(branches))) {
    return { kind: "unknown-handle", handle: text };
  }

  const probe = toOneLine(text);
  const candidates = await findAddressCandidates(client, probe);
  const probeNote = probe === text ? undefined : probe;

  const outcomes = candidates.map((candidate) =>
    resolveCandidateAgainstListing(candidate, branches, radiusKm, receiptsByBranchId),
  );
  const matched = outcomes.filter(
    (outcome): outcome is Extract<CandidateOutcome, { kind: "matched" }> => outcome.kind === "matched",
  );
  const settled = outcomes.filter(
    (outcome): outcome is Extract<CandidateOutcome, { kind: "settlement" }> => outcome.kind === "settlement",
  );

  const matches = sortMatchesByScoreThenReceipts(
    dedupeMatchesByBranch(matched.flatMap((outcome) => outcome.matches)),
    receiptsByBranchId,
  );
  const near = sortRankedByDistance(
    dedupeRankedByBranch(settled.flatMap((outcome) => outcome.stores)),
    receiptsByBranchId,
  );

  if (matches.length > 0 || near.length > 0) {
    const points: LocatedPoint[] = (() => {
      if (matches.length === 0) return settled.map((outcome) => outcome.point);

      const topCandidate: PlaceCandidate = { kind: "store", branch: matches[0]!.branch };
      const point = coordinatesOf(topCandidate);

      return point === null ? [] : [{ point, measuredFrom: topCandidate }];
    })();

    return {
      kind: "resolved",
      matches,
      near,
      points,
      resolvedPlaces: [...matched, ...settled].map((outcome) => outcome.candidate),
      probe: probeNote,
    };
  }

  const { structured: saved } = await client.getMyDeliveryAddresses();
  const savedMatches = matchSavedAddressesForRanking(text, saved.addresses);

  if (savedMatches.length > 0) {
    const candidate: PlaceCandidate = { kind: "saved", address: savedMatches[0]! };
    const point = coordinatesOf(candidate)!;

    return {
      kind: "resolved",
      matches: [],
      near: [],
      points: [{ point, measuredFrom: candidate }],
      resolvedPlaces: [],
    };
  }

  if (candidates.length === 0) return { kind: "none" };

  const candidatePoints: LocatedPoint[] = candidates.map((candidate) => ({
    point: { latitude: candidate.latitude, longitude: candidate.longitude },
    measuredFrom: { kind: "address", address: candidate } as const,
  }));

  const nearestByGeometry = nearestAmong(branches, candidatePoints, radiusKm, receiptsByBranchId);

  const contributingCandidates =
    nearestByGeometry.length === 0
      ? candidates
      : candidates.filter((candidate) =>
          nearestByGeometry.some((store) => {
            const measuredFrom = store.distance?.measuredFrom;

            return measuredFrom?.kind === "address" && measuredFrom.address === candidate;
          }),
        );

  return {
    kind: "resolved",
    matches: [],
    near: nearestByGeometry,
    points: [],
    resolvedPlaces: contributingCandidates,
    probe: probeNote,
  };
}

export type DistanceSignal = {
  readonly kilometres: number;
  readonly point: Coordinates;
  readonly measuredFrom: MeasuredFrom;
};
export type StoreTiebreak = "receipts" | "branch id";
export type MatchSignal =
  | { readonly kind: "handle"; readonly score: number }
  | {
      readonly kind: "address";
      readonly score: number;
      readonly parts: MatchedParts;
      readonly tiebreak?: StoreTiebreak;
    }
  | { readonly kind: "settlement" };

export type RankedStore = {
  readonly branch: Branch;
  readonly receipts?: ReceiptSignal;
  readonly distance?: DistanceSignal;
  readonly match?: MatchSignal;
};

export type StoreRanking =
  | {
      readonly outcome: "ranked";
      readonly stores: readonly RankedStore[];
      readonly unjoinedReceipts: number;
      readonly resolvedPlaces?: readonly FoundAddress[];
      readonly probe?: string;
      readonly servingBranches?: readonly ServingBranch[];
    }
  | {
      readonly outcome: "none";
      readonly unjoinedReceipts: number;
      readonly receiptsRead: number;
      readonly hasSavedAddresses: boolean;
    }
  | {
      readonly outcome: "no-match";
      readonly query: string;
      readonly unjoinedReceipts: number;
    }
  | {
      readonly outcome: "unknown-handle";
      readonly handle: string;
      readonly unjoinedReceipts: number;
    };

export type RankStoresOptions = {
  readonly query?: string;
  readonly radiusKm?: number;
  readonly filter?: StoreListingFilter;
};

export const DEFAULT_RADIUS_KM = 15;

function branchReceiptCompare(receipts: ReadonlyMap<string, ReceiptSignal>) {
  return (a: Branch, b: Branch): number => {
    const diff = (receipts.get(b.branchId)?.count ?? 0) - (receipts.get(a.branchId)?.count ?? 0);

    return diff !== 0 ? diff : a.branchId.localeCompare(b.branchId);
  };
}

function nearestAmong(
  branches: readonly Branch[],
  points: readonly LocatedPoint[],
  radiusKm: number,
  receipts: ReadonlyMap<string, ReceiptSignal>,
): RankedStore[] {
  if (points.length === 0) return [];

  const located = branches.flatMap((branch) => {
    if (branch.latitude === null || branch.longitude === null) return [];

    const at = { latitude: Number(branch.latitude), longitude: Number(branch.longitude) };
    const nearest = points
      .map((candidate) => ({ ...candidate, kilometres: greatCircleKm(candidate.point, at) }))
      .reduce((min, candidate) => (candidate.kilometres < min.kilometres ? candidate : min));

    return nearest.kilometres <= radiusKm ? [{ branch, ...nearest }] : [];
  });

  located.sort((a, b) => (a.kilometres !== b.kilometres ? a.kilometres - b.kilometres : branchReceiptCompare(receipts)(a.branch, b.branch)));

  return located.map(({ branch, kilometres, point, measuredFrom }) => ({
    branch,
    distance: { kilometres, point, measuredFrom },
    receipts: receipts.get(branch.branchId),
  }));
}

function withHandledRejection<T>(promise: Promise<T>): Promise<T> {
  promise.catch(() => undefined);

  return promise;
}

export async function rankStores(client: PlaceClient, options: RankStoresOptions = {}): Promise<StoreRanking> {
  const radiusKm = options.radiusKm ?? DEFAULT_RADIUS_KM;
  const query = options.query?.trim();
  const hasQuery = query !== undefined && query !== "";
  const coordinateQuery = hasQuery ? parseCoordinatePair(query) : null;

  const branchesRead = listStores(client, options.filter);
  const ordersRead = readOfflineOrders(client);
  const savedRead = hasQuery ? undefined : withHandledRejection(client.getMyDeliveryAddresses());
  const deliveryTypesRead =
    coordinateQuery === null
      ? undefined
      : withHandledRejection(
          client.getAvailableDeliveryTypes({
            latitude: coordinateQuery.latitude,
            longitude: coordinateQuery.longitude,
          }),
        );

  const [{ branches }, { orders }] = await Promise.all([branchesRead, ordersRead]);
  const receipts = joinReceipts(orders, branches);
  const servingBranches =
    deliveryTypesRead === undefined
      ? undefined
      : joinServingBranches((await deliveryTypesRead).structured.options, branches);

  if (query !== undefined && query !== "") {
    const resolved = await resolveQuery(client, query, branches, receipts.byBranchId, radiusKm);

    if (resolved.kind === "unknown-handle") {
      return {
        outcome: "unknown-handle",
        handle: resolved.handle,
        unjoinedReceipts: receipts.unjoined,
      };
    }
    if (resolved.kind === "none") {
      return { outcome: "no-match", query, unjoinedReceipts: receipts.unjoined };
    }

    const matchedBranchIds = new Set(resolved.matches.map((match) => match.branch.branchId));
    const dedupedNear = resolved.near.filter((store) => !matchedBranchIds.has(store.branch.branchId));

    const matchedIds = new Set([...matchedBranchIds, ...dedupedNear.map((store) => store.branch.branchId)]);

    const matched: RankedStore[] = resolved.matches
      .map((candidate) => ({
        branch: candidate.branch,
        match:
          candidate.kind === "handle"
            ? ({ kind: "handle" as const, score: candidate.score } satisfies MatchSignal)
            : ({
                kind: "address" as const,
                score: candidate.score,
                parts: candidate.parts,
              } satisfies MatchSignal),
        receipts: receipts.byBranchId.get(candidate.branch.branchId),
      }))
      .map((store, index, sorted) => {
        const previous = sorted[index - 1];

        if (previous === undefined || previous.match.kind !== "address" || store.match.kind !== "address") {
          return store;
        }
        if (previous.match.score !== store.match.score) return store;

        const tiebreak: StoreTiebreak =
          (receipts.byBranchId.get(store.branch.branchId)?.count ?? 0) !==
          (receipts.byBranchId.get(previous.branch.branchId)?.count ?? 0)
            ? "receipts"
            : "branch id";

        return { ...store, match: { ...store.match, tiebreak } };
      });

    const remaining = branches.filter((branch) => !matchedIds.has(branch.branchId));
    const near = resolved.points.length === 0 ? [] : nearestAmong(remaining, resolved.points, radiusKm, receipts.byBranchId);

    return {
      outcome: "ranked",
      stores: [...matched, ...dedupedNear, ...near],
      unjoinedReceipts: receipts.unjoined,
      resolvedPlaces: resolved.resolvedPlaces.length === 0 ? undefined : resolved.resolvedPlaces,
      probe: resolved.probe,
      servingBranches,
    };
  }

  const receiptStores: RankedStore[] = branches
    .filter((branch) => receipts.byBranchId.has(branch.branchId))
    .sort(branchReceiptCompare(receipts.byBranchId))
    .map((branch) => ({ branch, receipts: receipts.byBranchId.get(branch.branchId) }));

  const { structured: saved } = await savedRead!;
  const savedPoints: LocatedPoint[] = saved.addresses.flatMap((address) => {
    const candidate: PlaceCandidate = { kind: "saved", address };
    const point = coordinatesOf(candidate);

    return point === null ? [] : [{ point, measuredFrom: candidate }];
  });

  const remaining = branches.filter((branch) => !receipts.byBranchId.has(branch.branchId));
  const near = nearestAmong(remaining, savedPoints, radiusKm, receipts.byBranchId);

  if (receiptStores.length === 0 && near.length === 0) {
    return {
      outcome: "none",
      unjoinedReceipts: receipts.unjoined,
      receiptsRead: receipts.total,
      hasSavedAddresses: saved.addresses.length > 0,
    };
  }

  return {
    outcome: "ranked",
    stores: [...receiptStores, ...near],
    unjoinedReceipts: receipts.unjoined,
  };
}

function coordinatesRow(latitude: string | number, longitude: string | number): string {
  return formatEntryAsRow("coordinates", `${formatCoordinate(latitude)}, ${formatCoordinate(longitude)}`);
}

export function addressCandidateText(candidate: FoundAddress): string {
  const { district, latitude, longitude } = candidate;

  return formatRows([
    formatEntryAsRow("address", foundAddressText(candidate)),
    district && formatEntryAsRow("district", district),
    coordinatesRow(latitude, longitude),
  ]);
}

function savedCandidateText(address: SavedAddress): string {
  const { id, tag, latitude, longitude } = address;
  const place = savedAddressText(address);

  return formatRows([
    formatEntryAsRow("id", id),
    tag && formatEntryAsRow("tag", tag),
    place !== "" && formatEntryAsRow("address", place),
    latitude !== null && longitude !== null && coordinatesRow(latitude, longitude),
  ]);
}

function storeCandidateText(branch: Branch): string {
  const { branchId, latitude, longitude } = branch;
  const place = storeAddressText(branch);

  return formatRows([
    formatEntryAsRow("id", branchId),
    place !== "" && formatEntryAsRow("address", place),
    latitude !== null && longitude !== null && coordinatesRow(latitude, longitude),
  ]);
}

function placeCandidateText(candidate: PlaceCandidate): string {
  if (candidate.kind === "saved") return savedCandidateText(candidate.address);
  if (candidate.kind === "store") return storeCandidateText(candidate.branch);

  return addressCandidateText(candidate.address);
}

export function placeCandidatesText(candidates: readonly PlaceCandidate[]): string {
  const items = candidates.map(placeCandidateText);
  const answerable = candidates.every((candidate) => candidate.kind === "store");
  const summary = formatRows([
    `Found ${candidates.length} matching places`,
    answerable && "pass one of these ids back with cart setup --to",
  ]);

  return `${formatList([summary, formatList(items)])}\n`;
}
