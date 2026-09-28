import { silpo } from "../daemon/client.js";
import type { Promotion } from "../mcp/entities/promotion.js";
import type { DeliveryType } from "../mcp/entities/delivery.js";
import { buildMatcher, type MatchCandidate, type Matcher } from "./matching.js";

type PromotionMatchDocument = {
  readonly key: string;
  readonly title: string;
};

const PROMOTION_FIELDS = ["title"] as const;

export type PromotionRecord = {
  readonly code: string;
  readonly title: string;
  readonly count: number;
};

export type PromotionTable = {
  readonly records: readonly PromotionRecord[];
  readonly byCode: ReadonlyMap<string, PromotionRecord>;
};

export function buildPromotionTable(promotions: readonly Promotion[]): PromotionTable {
  const records = promotions
    .filter((promotion) => promotion.productCount > 0)
    .map(({ code, title, productCount }) => ({ code, title, count: productCount }));

  return {
    records,
    byCode: new Map(records.map((record) => [record.code, record] as const)),
  };
}

export async function readPromotionTable(
  branchId: string,
  deliveryType: DeliveryType,
  timeslot: { readonly start: string; readonly end: string },
): Promise<PromotionTable> {
  const { structured } = await silpo.getPromotions({
    branchId,
    deliveryType,
    timeslotStart: timeslot.start,
    timeslotEnd: timeslot.end,
  });

  return buildPromotionTable(structured.promotions);
}

export type PromotionMatcher = Matcher<PromotionRecord>;

export function promotionMatcher(records: readonly PromotionRecord[]): PromotionMatcher {
  return buildMatcher<PromotionRecord, PromotionMatchDocument>(
    records,
    (record) => record.code,
    PROMOTION_FIELDS,
    (record) => ({ key: record.code, title: record.title }),
    { prefix: true },
  );
}

function exactPromotion(table: PromotionTable, value: string): PromotionRecord | undefined {
  return table.byCode.get(value);
}

export function rankPromotions(
  table: PromotionTable,
  text: string,
): readonly MatchCandidate<PromotionRecord>[] {
  const exact = exactPromotion(table, text);
  if (exact !== undefined) return [{ record: exact, score: Number.POSITIVE_INFINITY, accounted: true }];

  return promotionMatcher(table.records).search(text);
}
