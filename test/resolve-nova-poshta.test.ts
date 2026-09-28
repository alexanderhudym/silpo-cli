import assert from "node:assert/strict";
import { test } from "node:test";

const { resolveNovaPoshta, settlementCandidatesText, officeCandidatesText } = await import(
  "../dist/resolve/nova-poshta.js"
);

function settlement(overrides: Record<string, unknown> = {}) {
  return { id: "s-1", title: "Ірпінь", area: "Київська", region: "Ірпінська", ...overrides };
}

function office(overrides: Record<string, unknown> = {}) {
  return {
    id: "o-1",
    title: "Відділення №1: вул. Соборна, 1",
    address: "вул. Соборна, 1",
    type: "Branch",
    number: 1,
    status: "Working",
    latitude: 50.5,
    longitude: 30.5,
    ...overrides,
  };
}

function client(options: { settlements?: unknown[]; offices?: unknown[] } = {}) {
  const calls: { tool: string; args: Record<string, unknown> }[] = [];

  return {
    calls,
    async findNovaPoshtaSettlements(args: Record<string, unknown>) {
      calls.push({ tool: "settlements", args });

      return {
        content: "",
        structured: { success: true, summary: "", settlements: options.settlements ?? [] },
      };
    },
    async findNovaPoshtaOffices(args: Record<string, unknown>) {
      calls.push({ tool: "offices", args });

      return {
        content: "",
        structured: { success: true, summary: "", offices: options.offices ?? [], meta: { total: 0 } },
      };
    },
  };
}

test("a settlement matching nothing resolves nothing rather than picking a listing's first row", async () => {
  const c = client({});

  assert.deepEqual(await resolveNovaPoshta(c as never, "Незнайомсько"), { outcome: "no-settlement" });
  assert.deepEqual(c.calls, [{ tool: "settlements", args: { title: "Незнайомсько" } }]);
});

test("two settlements stop the resolution before any office is looked up", async () => {
  const first = settlement({ id: "s-1" });
  const second = settlement({ id: "s-2", region: null });
  const c = client({ settlements: [first, second] });

  const resolution = await resolveNovaPoshta(c as never, "Ірпінь");

  assert.deepEqual(resolution, { outcome: "ambiguous-settlement", candidates: [first, second] });
  assert.deepEqual(
    c.calls.map((call) => call.tool),
    ["settlements"],
  );
});

test("a settlement with no matching office resolves nothing, carrying the settlement", async () => {
  const found = settlement();
  const c = client({ settlements: [found] });

  assert.deepEqual(await resolveNovaPoshta(c as never, "Ірпінь", "Соборна"), {
    outcome: "no-office",
    settlement: found,
  });
});

test("two offices in the settlement stop the resolution, and no office is guessed at", async () => {
  const found = settlement();
  const first = office({ id: "o-1" });
  const second = office({ id: "o-2" });
  const c = client({ settlements: [found], offices: [first, second] });

  const resolution = await resolveNovaPoshta(c as never, "Ірпінь", "Соборна");

  assert.deepEqual(resolution, { outcome: "ambiguous-office", settlement: found, candidates: [first, second] });
});

test("one settlement and one office resolve to a single office carrying its own coordinates", async () => {
  const found = settlement();
  const single = office();
  const c = client({ settlements: [found], offices: [single] });

  const resolution = await resolveNovaPoshta(c as never, "Ірпінь", "Соборна");

  assert.deepEqual(resolution, { outcome: "resolved", settlement: found, office: single });
  assert.deepEqual(c.calls[1]?.args, { settlementId: "s-1", title: "Соборна" });
});

test("a settlement is printed by its id, title, area and region", () => {
  assert.equal(
    settlementCandidatesText([settlement()]),
    "Found 1 matching settlements\n\nid: s-1\ntitle: Ірпінь\narea: Київська\nregion: Ірпінська\n",
  );
});

test("an office is printed by its id and coordinates under their keys, then its title with no key", () => {
  const text = officeCandidatesText([office()]);

  assert.equal(
    text,
    "Found 1 matching offices\n\nid: o-1\ncoordinates: 50.5, 30.5\nВідділення №1: вул. Соборна, 1\n",
  );
});

test("a working office says nothing about its status, and one that is not names it", () => {
  const text = officeCandidatesText([office({ id: "working" }), office({ id: "closed", status: "Reorganization" })]);
  const records = text.trimEnd().split("\n\n").slice(1);

  assert.ok(!records[0]?.includes("status"), "a working office printed a status line");
  assert.ok(records[1]?.includes("\nstatus: Reorganization\n"), "the office's status was dropped");
});
