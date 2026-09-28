import assert from "node:assert/strict";
import { test } from "node:test";

const { formatCoordinate, parseCoordinatePair } = await import("../dist/utils/coordinate.js");

test("rounds a coordinate to six decimals and drops trailing zeros", () => {
  assert.equal(formatCoordinate("50.4501200"), "50.45012");
  assert.equal(formatCoordinate(30.5234112345), "30.523411");
  assert.equal(formatCoordinate(50), "50");
});

test("leaves a coordinate it cannot read as a number as it stands", () => {
  assert.equal(formatCoordinate("north"), "north");
});

test("parses a latitude and a longitude separated by a comma", () => {
  assert.deepEqual(parseCoordinatePair("50.45,30.52"), { latitude: 50.45, longitude: 30.52 });
});

test("tolerates space around the comma and negative values", () => {
  assert.deepEqual(parseCoordinatePair("50.45 , -30.52"), { latitude: 50.45, longitude: -30.52 });
});

test("a single number is not a pair", () => {
  assert.equal(parseCoordinatePair("50.4"), null);
});

test("free text is not a pair", () => {
  assert.equal(parseCoordinatePair("Хрещатик, 1"), null);
  assert.equal(parseCoordinatePair(""), null);
});
