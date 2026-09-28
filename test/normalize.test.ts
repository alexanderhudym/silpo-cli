import assert from "node:assert/strict";
import { test } from "node:test";

const { parseItem } = await import("../dist/resolve/normalize.js");

test("a fat percentage is a specification, not a quantity", () => {
  const parsed = parseItem("молоко 2,5%");

  assert.equal(parsed.term, "молоко");
  assert.deepEqual(parsed.specification, { kind: "percentage", value: 2.5 });
  assert.equal(parsed.quantity, undefined);
  assert.equal(parsed.packCandidate, undefined);
});

test("a bare number is a quantity", () => {
  const parsed = parseItem("молоко 2");

  assert.equal(parsed.term, "молоко");
  assert.equal(parsed.quantity, 2);
  assert.equal(parsed.specification, undefined);
  assert.equal(parsed.packCandidate, undefined);
});

test("a number with a mass unit is always a specification, never a quantity", () => {
  const parsed = parseItem("молоко 950г");

  assert.equal(parsed.term, "молоко");
  assert.deepEqual(parsed.packCandidate, { value: 950, unit: "г" });
  assert.equal(parsed.specification, undefined);
  assert.equal(parsed.quantity, undefined);
});

test("a number with a volume unit is always a specification, never a quantity", () => {
  const parsed = parseItem("вода 2л");

  assert.equal(parsed.term, "вода");
  assert.deepEqual(parsed.packCandidate, { value: 2, unit: "л" });
  assert.equal(parsed.quantity, undefined);
});

test("an item can carry both a quantity and a specification", () => {
  const parsed = parseItem("молоко 2 2,5%");

  assert.equal(parsed.term, "молоко");
  assert.equal(parsed.quantity, 2);
  assert.deepEqual(parsed.specification, { kind: "percentage", value: 2.5 });
});

test("a mass unit written apart from its number is still a pack candidate", () => {
  const parsed = parseItem("молоко 950 г");

  assert.equal(parsed.term, "молоко");
  assert.deepEqual(parsed.packCandidate, { value: 950, unit: "г" });
  assert.equal(parsed.quantity, undefined);
});

test("a multi-word term is preserved in order", () => {
  const parsed = parseItem("молоко яготинське 2,5%");

  assert.equal(parsed.term, "молоко яготинське");
  assert.deepEqual(parsed.specification, { kind: "percentage", value: 2.5 });
});

test("шт names the unit a count is written in and never reaches the term", () => {
  assert.deepEqual(parseItem("авокадо 2 шт"), {
    term: "авокадо",
    quantity: undefined,
    specification: undefined,
    packCandidate: undefined,
    countCandidate: 2,
  });
});

test("a count written against its unit is read the same way", () => {
  assert.deepEqual(parseItem("авокадо 2шт"), {
    term: "авокадо",
    quantity: undefined,
    specification: undefined,
    packCandidate: undefined,
    countCandidate: 2,
  });
});

test("a number in pieces is left for the product to read, and is not a quantity on its own", () => {
  assert.deepEqual(parseItem("яйця курячі 10 шт"), {
    term: "яйця курячі",
    quantity: undefined,
    specification: undefined,
    packCandidate: undefined,
    countCandidate: 10,
  });
});

test("a bare number with no unit is still a quantity", () => {
  assert.deepEqual(parseItem("молоко 2"), {
    term: "молоко",
    quantity: 2,
    specification: undefined,
    packCandidate: undefined,
    countCandidate: undefined,
  });
});

test("a mass keeps its unit, which is not a count", () => {
  assert.deepEqual(parseItem("куряче філе 300 г"), {
    term: "куряче філе",
    quantity: undefined,
    specification: undefined,
    packCandidate: { value: 300, unit: "г" },
    countCandidate: undefined,
  });
});
