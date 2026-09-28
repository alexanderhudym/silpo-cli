import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import {
  clearToolCalls,
  fixture,
  output,
  render,
  renderTools,
  run,
  setPayloads,
  startDaemon,
  stopDaemon,
  toolCalls,
} from "./harness.ts";

const SETTLEMENTS_TOOL = "silpo_find_nova_poshta_settlements";
const OFFICES_TOOL = "silpo_find_nova_poshta_offices";

const OFFICES = { [SETTLEMENTS_TOOL]: "np.settlements", [OFFICES_TOOL]: "np.offices" } as const;
const WITH_OFFICE = ["np", "Ірпінь", "--office", "Соборна"];

before(startDaemon);
after(stopDaemon);

test("a settlement is named in words and resolved by the CLI itself", async () => {
  const text = await render("np.settlements", ["np", "Ірпінь"]);

  assert.equal(
    text,
    "Found 1 settlements\n\nid: de1b22c4-2ad2-4dad-80bf-64525ade9f59\ntitle: Ірпінь\narea: Київська\nregion: Ірпінська\n",
  );
});

test("every office of a settlement is printed", async () => {
  const text = await renderTools(OFFICES, WITH_OFFICE);
  const payload = fixture("np.offices") as { offices: unknown[] };

  assert.equal(
    text.split("\n").filter((line) => /^id: [0-9a-f-]{36}$/.test(line)).length,
    payload.offices.length,
  );
});

test("every office record carries its coordinates, the only source a cart address has", async () => {
  const text = await renderTools(OFFICES, WITH_OFFICE);
  const records = text.trimEnd().split("\n\n").slice(1);

  assert.ok(records.length > 0, "the office listing printed nothing");
  assert.ok(
    records.every((record) => /\ncoordinates: -?\d+(\.\d+)?, -?\d+(\.\d+)?\n/.test(record)),
    "an office was printed without the pair a Nova Poshta cart address must carry",
  );
});

test("the settlement is resolved once, then its offices are matched by the office name", async () => {
  setPayloads({
    [SETTLEMENTS_TOOL]: fixture("np.settlements"),
    [OFFICES_TOOL]: fixture("np.offices"),
  });
  clearToolCalls();

  const text = await run(WITH_OFFICE);

  assert.ok(text.startsWith("Found 72 offices"), text);

  const settlementsCall = toolCalls().find((call) => call.name === SETTLEMENTS_TOOL);
  const officesCall = toolCalls().find((call) => call.name === OFFICES_TOOL);

  assert.deepEqual(settlementsCall?.arguments, { title: "Ірпінь" });
  assert.deepEqual(officesCall?.arguments, {
    settlementId: "de1b22c4-2ad2-4dad-80bf-64525ade9f59",
    title: "Соборна",
  });
});

test("a settlement matching several stops before any office is looked up", async () => {
  setPayloads({
    [SETTLEMENTS_TOOL]: {
      success: true,
      summary: "Found 2 settlements",
      settlements: [
        { id: "s-1", title: "Ірпінь", area: "Київська", region: "Ірпінська" },
        { id: "s-2", title: "Ірпінь", area: "Одеська", region: null },
      ],
    },
  });
  clearToolCalls();

  const { text, code } = await output(WITH_OFFICE);

  assert.ok(text.startsWith("Found 2 settlements"), text);
  assert.notEqual(code, 0, "an ambiguous settlement did not fail the command");
  assert.deepEqual(
    toolCalls().map((call) => call.name),
    [SETTLEMENTS_TOOL],
    "an office lookup went out despite the settlement being ambiguous",
  );
});

test("without --office a settlement matching several is simply the answer, not an error to stop on", async () => {
  setPayloads({
    [SETTLEMENTS_TOOL]: {
      success: true,
      summary: "Found 2 settlements",
      settlements: [
        { id: "s-1", title: "Ірпінь", area: "Київська", region: "Ірпінська" },
        { id: "s-2", title: "Ірпінь", area: "Одеська", region: null },
      ],
    },
  });

  const { code } = await output(["np", "Ірпінь"]);

  assert.equal(code, 0, "a plain settlement listing failed the command");
});

test("the lookup writes nothing: no cart tool is ever called", async () => {
  setPayloads({
    [SETTLEMENTS_TOOL]: fixture("np.settlements"),
    [OFFICES_TOOL]: fixture("np.offices"),
  });
  clearToolCalls();

  await run(WITH_OFFICE);

  assert.deepEqual(
    toolCalls().map((call) => call.name),
    [SETTLEMENTS_TOOL, OFFICES_TOOL],
  );
});

test("no np command prints whether the call succeeded", async () => {
  assert.ok(!(await render("np.settlements", ["np", "Ірпінь"])).includes("success"));
  assert.ok(!(await renderTools(OFFICES, WITH_OFFICE)).includes("success"));
});
