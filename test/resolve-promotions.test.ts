import assert from "node:assert/strict";
import { test } from "node:test";

const { buildPromotionTable, rankPromotions } = await import("../dist/resolve/promotions.js");

function promotionTable(records: readonly Record<string, unknown>[]): Record<string, unknown> {
  return { records, byCode: new Map(records.map((record) => [record.code, record] as const)) };
}

test("a promotion holding no products is dropped, one holding some is kept with its count", () => {
  const promotions = [
    { code: "empty-promo", title: "Порожня знижка", productCount: 0, url: "" },
    { code: "kept-promo", title: "Триває знижка", productCount: 7, url: "" },
  ];

  const table = buildPromotionTable(promotions);

  assert.equal(table.records.length, 1);
  assert.equal(table.byCode.has("empty-promo"), false);
  assert.equal(table.byCode.get("kept-promo").count, 7);
});

test("a promotion is matched by title and by code", () => {
  const table = promotionTable([{ code: "additional", title: "Додаткова знижка", count: 10 }]);

  const byTitle = rankPromotions(table, "Додаткова знижка");
  assert.equal(byTitle.length, 1);
  assert.equal(byTitle[0].record.code, "additional");

  const byCode = rankPromotions(table, "additional");
  assert.equal(byCode.length, 1);
  assert.equal(byCode[0].record.code, "additional");
});

test("a value naming no promotion matches nothing", () => {
  const table = promotionTable([{ code: "additional", title: "Додаткова знижка", count: 10 }]);

  const ranked = rankPromotions(table, "unknown-junk-text");

  assert.equal(ranked.length, 0);
});
