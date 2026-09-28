import { silpo } from "../daemon/client.js";
import type { ProductSet } from "../mcp/entities/product-set.js";
import type { DeliveryType } from "../mcp/entities/delivery.js";
import { buildMatcher, type MatchCandidate, type Matcher } from "./matching.js";

type SetMatchDocument = {
  readonly key: string;
  readonly title: string;
};

const SET_FIELDS = ["title"] as const;

export type SetRecord = {
  readonly slug: string;
  readonly title: string;
  readonly description: string | undefined;
};

export type SetTable = {
  readonly records: readonly SetRecord[];
  readonly bySlug: ReadonlyMap<string, SetRecord>;
};

export function buildSetTable(sets: readonly ProductSet[]): SetTable {
  const records = sets.map(({ slug, title, description }) => ({
    slug,
    title,
    description: description ?? undefined,
  }));

  return { records, bySlug: new Map(records.map((record) => [record.slug, record] as const)) };
}

export async function readSetTable(branchId: string, deliveryType: DeliveryType): Promise<SetTable> {
  const { structured } = await silpo.getProductSets({ branchId, deliveryType });

  return buildSetTable(structured.sets);
}

export type SetMatcher = Matcher<SetRecord>;

export function setMatcher(records: readonly SetRecord[]): SetMatcher {
  return buildMatcher<SetRecord, SetMatchDocument>(
    records,
    (record) => record.slug,
    SET_FIELDS,
    (record) => ({ key: record.slug, title: record.title }),
    { prefix: true },
  );
}

function exactSet(table: SetTable, value: string): SetRecord | undefined {
  return table.bySlug.get(value);
}

export function rankSets(table: SetTable, text: string): readonly MatchCandidate<SetRecord>[] {
  const exact = exactSet(table, text);
  if (exact !== undefined) return [{ record: exact, score: Number.POSITIVE_INFINITY, accounted: true }];

  return setMatcher(table.records).search(text);
}
