import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { toExternalId } from "../dist/utils/slug.js";

const FIXTURES = fileURLToPath(new URL("./fixtures/", import.meta.url));

type Carrier = { slug: unknown; externalProductId: unknown };

function isCarrier(value: unknown): value is Carrier {
  return typeof value === "object" && value !== null && "externalProductId" in value;
}

function carriers(value: unknown, found: Carrier[]): Carrier[] {
  if (Array.isArray(value)) {
    for (const item of value) carriers(item, found);
  } else if (typeof value === "object" && value !== null) {
    if (isCarrier(value)) found.push(value);

    for (const inner of Object.values(value)) carriers(inner, found);
  }

  return found;
}

test("every recorded product carries an external id that is the tail of its slug", () => {
  const names = readdirSync(FIXTURES).filter((name) => name.endsWith(".json"));
  let seen = 0;

  for (const name of names) {
    const payload = JSON.parse(readFileSync(join(FIXTURES, name), "utf8")) as unknown;

    for (const { slug, externalProductId } of carriers(payload, [])) {
      const where = `${name} ${String(slug)}`;

      assert.equal(typeof externalProductId, "number", where);
      assert.ok(Number.isSafeInteger(externalProductId), where);
      assert.equal(typeof slug, "string", where);
      assert.equal(toExternalId(slug as string), externalProductId, where);
      seen += 1;
    }
  }

  assert.ok(seen > 0, "no fixture carries a product with an external id");
});
