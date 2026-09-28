import assert from "node:assert/strict";
import { test } from "node:test";

import { toExternalId } from "../dist/utils/slug.js";

test("reads the digits after the last hyphen", () => {
  assert.equal(toExternalId("krevetka-korolivska-syra-defrostovana-40-60-864122"), 864122);
  assert.equal(toExternalId("voda-morshynska-36629"), 36629);
});

test("reads the last run of digits when the number appears twice", () => {
  assert.equal(toExternalId("paket-biorozkladnyi-3-kg-958358-958358"), 958358);
});

test("reads nothing from a slug with no hyphen", () => {
  assert.equal(toExternalId("864122"), null);
  assert.equal(toExternalId(""), null);
});

test("reads nothing where the tail is not a run of digits", () => {
  assert.equal(toExternalId("krevetka-korolivska-syra"), null);
  assert.equal(toExternalId("paket-biorozkladnyi-3kg"), null);
  assert.equal(toExternalId("tofu-kopchenyi-"), null);
  assert.equal(toExternalId("tofu-kopchenyi--"), null);
  assert.equal(toExternalId("tofu-kopchenyi-12a"), null);
  assert.equal(toExternalId("tofu-kopchenyi-1.5"), null);
  assert.equal(toExternalId("tofu-kopchenyi--12"), 12);
});

test("reads nothing from a tail too large to be a safe integer", () => {
  assert.equal(toExternalId("tofu-kopchenyi-9007199254740991"), 9007199254740991);
  assert.equal(toExternalId("tofu-kopchenyi-9007199254740993"), null);
});
